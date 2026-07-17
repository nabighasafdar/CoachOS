from __future__ import annotations

import uuid
from datetime import date, timedelta

from agents.llm import llm_json
from memory.chroma_store import memory_store
from schemas.state import (
    AgentName,
    DecisionLogEntry,
    SessionStatus,
    UserProfile,
    WeeklyPlan,
    WorkoutSession,
)
from store.db import store


FOCUS_ROTATION = [
    ("Full Body Strength", ["Squat", "Push-up", "Row", "Plank"]),
    ("Upper Push", ["Bench/Push-up", "Overhead Press", "Triceps", "Core"]),
    ("Lower Strength", ["Lunge", "RDL/Hinge", "Calf raise", "Core"]),
    ("Conditioning", ["Intervals", "Bike/Row/Run", "Mobility"]),
    ("Pull + Core", ["Pull-up/Row", "Face pull", "Dead bug", "Carry"]),
]


def _week_start(d: date | None = None) -> str:
    d = d or date.today()
    start = d - timedelta(days=d.weekday())
    return start.isoformat()


def _heuristic_plan(profile: UserProfile) -> WeeklyPlan:
    days = profile.available_days or ["mon", "wed", "fri"]
    equipment = ", ".join(profile.equipment) if profile.equipment else "bodyweight"
    sessions: list[WorkoutSession] = []
    for i, day in enumerate(days):
        focus, exercises = FOCUS_ROTATION[i % len(FOCUS_ROTATION)]
        if profile.injuries:
            exercises = [e for e in exercises if "Squat" not in e and "Lunge" not in e] or [
                "Seated press",
                "Band row",
                "Core anti-rotation",
            ]
            focus = f"Injury-aware {focus}"
        if profile.experience_level == "beginner":
            duration = 35
        elif profile.experience_level == "advanced":
            duration = 60
        else:
            duration = 45
        sessions.append(
            WorkoutSession(
                id=uuid.uuid4().hex[:10],
                day=day,
                title=f"{day.upper()} · {focus}",
                focus=focus,
                exercises=exercises + [f"Equipment: {equipment}"],
                duration_min=duration,
                status=SessionStatus.planned,
            )
        )
    return WeeklyPlan(user_id=profile.user_id, week_start=_week_start(), sessions=sessions)


async def run_planner(profile: UserProfile, force: bool = False) -> WeeklyPlan:
    existing = store.get_plan(profile.user_id)
    if existing and not force:
        return existing

    memory = memory_store.recall(profile.user_id, "successful training week", n=3)
    prompt = f"""
Create a weekly workout plan as JSON with keys: sessions (array of objects with day, title, focus, exercises[], duration_min).
User goals: {profile.goals}
Equipment: {profile.equipment}
Injuries: {profile.injuries}
Available days: {profile.available_days}
Experience: {profile.experience_level}
Past memory: {memory}
Use only available days. Keep exercises practical.
"""
    parsed = await llm_json(prompt)
    if isinstance(parsed, dict) and parsed.get("sessions"):
        sessions = []
        for s in parsed["sessions"]:
            sessions.append(
                WorkoutSession(
                    id=uuid.uuid4().hex[:10],
                    day=str(s.get("day", "mon")).lower()[:3],
                    title=str(s.get("title", "Workout")),
                    focus=str(s.get("focus", "General")),
                    exercises=list(s.get("exercises") or ["Movement practice"]),
                    duration_min=int(s.get("duration_min") or 45),
                    status=SessionStatus.planned,
                )
            )
        plan = WeeklyPlan(user_id=profile.user_id, week_start=_week_start(), sessions=sessions)
    else:
        plan = _heuristic_plan(profile)

    store.set_plan(plan)
    store.add_decision(
        DecisionLogEntry(
            id=uuid.uuid4().hex[:12],
            user_id=profile.user_id,
            agent=AgentName.planner,
            action="generated_weekly_plan",
            reason=f"Built {len(plan.sessions)} sessions for goals={profile.goals or ['general fitness']}",
            inputs={
                "available_days": profile.available_days,
                "equipment": profile.equipment,
                "injuries": profile.injuries,
                "used_llm": parsed is not None,
            },
        )
    )
    memory_store.add(
        profile.user_id,
        f"Generated plan week {plan.week_start} with focuses: {[s.focus for s in plan.sessions]}",
    )
    return plan
