from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import date
from typing import Any

from agents.llm import llm_text
from agents.planner import run_planner
from agents.recovery import run_recovery
from schemas.state import (
    AgentName,
    DailySignals,
    DecisionLogEntry,
    SessionStatus,
    UserProfile,
    WeeklyPlan,
    WorkoutSession,
)
from store.db import store
from tools.weather import get_weather_client


PRIORITY = {"injury": 1, "recovery": 2, "weather": 3, "planner": 4}


async def _weather_proposal(profile: UserProfile, signals: DailySignals) -> dict[str, Any]:
    lat = profile.latitude if profile.latitude is not None else 37.77
    lon = profile.longitude if profile.longitude is not None else -122.42
    weather = await get_weather_client().forecast(lat, lon)
    signals.weather_summary = weather.get("summary", "")
    signals.precip_mm = float(weather.get("precip_mm") or 0)
    if signals.precip_mm >= 2.0:
        return {
            "agent": "weather",
            "action": "move_indoors",
            "reason": f"Rain expected ({signals.precip_mm} mm). Move outdoor work indoors.",
            "priority": PRIORITY["weather"],
            "inputs": weather,
        }
    return {
        "agent": "weather",
        "action": "keep_outdoors_ok",
        "reason": f"Weather OK ({signals.weather_summary}).",
        "priority": PRIORITY["weather"],
        "inputs": weather,
    }


def _apply_modifications(
    plan: WeeklyPlan,
    recovery: dict[str, Any],
    weather: dict[str, Any],
    skipped_session_id: str | None,
) -> tuple[WeeklyPlan, str]:
    updated = deepcopy(plan)
    updated.version += 1
    reasons: list[str] = []

    # Find today's / first planned session
    target: WorkoutSession | None = None
    if skipped_session_id:
        for s in updated.sessions:
            if s.id == skipped_session_id:
                s.status = SessionStatus.skipped
                store.record_skip(plan.user_id, s.day, s.title)
                reasons.append(f"Marked {s.title} skipped.")
                target = s
                break

    if target is None:
        for s in updated.sessions:
            if s.status == SessionStatus.planned:
                target = s
                break

    # Conflict resolution: injury/recovery beats planner backlog
    if recovery.get("action") == "rest" or (
        recovery.get("modifications", {}).get("convert_today_to") == "mobility_and_rest"
    ):
        if target and target.status != SessionStatus.skipped:
            target.title = f"{target.day.upper()} · Active Recovery"
            target.focus = "Recovery"
            target.exercises = ["Walk", "Breathing", "Gentle mobility"]
            target.duration_min = 20
            target.status = SessionStatus.moved
            reasons.append("Recovery/injury overrode planner: converted to active recovery.")
    elif recovery.get("action") in {"deload", "swap_to_mobility"} and target:
        factor = float(recovery.get("modifications", {}).get("duration_factor", 0.7))
        target.duration_min = max(20, int(target.duration_min * factor))
        target.focus = f"Easy · {target.focus}"
        target.exercises = ["Mobility flow"] + target.exercises[:2]
        target.status = SessionStatus.moved
        reasons.append("Recovery deload applied; shortened and softened session.")
    elif skipped_session_id:
        # Planner backlog: reschedule skipped work to next free-ish slot
        for s in updated.sessions:
            if s.status == SessionStatus.planned and s.id != skipped_session_id:
                s.notes = (s.notes + " + catch-up volume").strip()
                reasons.append(f"Planner backlog: added catch-up note to {s.title}.")
                break

    if weather.get("action") == "move_indoors" and target:
        target.notes = (target.notes + " [moved indoors due to weather]").strip()
        target.status = SessionStatus.moved
        reasons.append(weather["reason"])

    if not reasons:
        reasons.append("No hard conflicts — plan kept with minor verification.")

    return updated, " ".join(reasons)


async def run_adaptation(
    profile: UserProfile,
    trigger: str,
    signals: DailySignals | None = None,
    skipped_session_id: str | None = None,
) -> dict[str, Any]:
    plan = store.get_plan(profile.user_id)
    if plan is None:
        plan = await run_planner(profile, force=True)

    today = date.today().isoformat()
    signals = signals or store.get_signals(profile.user_id, today) or DailySignals(
        user_id=profile.user_id, date=today
    )

    recovery = await run_recovery(signals, plan)
    weather = await _weather_proposal(profile, signals)
    store.set_signals(signals)

    # Planner "behind" proposal
    skipped = sum(1 for s in plan.sessions if s.status == SessionStatus.skipped)
    planner_proposal = {
        "agent": "planner",
        "action": "catch_up" if skipped or skipped_session_id else "hold",
        "reason": (
            "You are behind on weekly volume — protect a catch-up slot."
            if skipped or skipped_session_id
            else "Weekly volume on track."
        ),
        "priority": PRIORITY["planner"],
    }

    updated, merge_reason = _apply_modifications(plan, recovery, weather, skipped_session_id)
    store.set_plan(updated)

    narrative = await llm_text(
        f"In 2 sentences explain this coaching decision to the athlete: {merge_reason} "
        f"Recovery={recovery['action']}, Weather={weather['action']}, Planner={planner_proposal['action']}.",
        model="llama-3.3-70b-versatile",
    )
    reason = narrative or merge_reason

    entry = DecisionLogEntry(
        id=uuid.uuid4().hex[:12],
        user_id=profile.user_id,
        agent=AgentName.adaptation,
        action="resolved_conflicts",
        reason=reason,
        inputs={
            "trigger": trigger,
            "proposals": {
                "recovery": recovery,
                "weather": weather,
                "planner": planner_proposal,
            },
            "priority_order": ["injury", "recovery", "weather", "planner"],
        },
    )
    store.add_decision(entry)

    # Also log peer proposals for Activity UI
    agent_map = {
        "recovery": AgentName.recovery,
        "planner": AgentName.planner,
        "weather": AgentName.adaptation,
        "nutrition": AgentName.nutrition,
    }
    for prop in (recovery, weather, planner_proposal):
        store.add_decision(
            DecisionLogEntry(
                id=uuid.uuid4().hex[:12],
                user_id=profile.user_id,
                agent=agent_map.get(prop["agent"], AgentName.adaptation),
                action=str(prop["action"]),
                reason=str(prop["reason"]),
                inputs=prop.get("inputs") or {},
            )
        )

    return {
        "plan": updated.model_dump(),
        "decision": entry.model_dump(),
        "proposals": {"recovery": recovery, "weather": weather, "planner": planner_proposal},
        "signals": signals.model_dump(),
    }
