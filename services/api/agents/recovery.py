from __future__ import annotations

from typing import Any

from schemas.state import DailySignals, WeeklyPlan


async def run_recovery(signals: DailySignals, plan: WeeklyPlan | None) -> dict[str, Any]:
    """Propose rest / swap / keep based on check-in signals."""
    score = (signals.sleep + signals.energy) - signals.soreness
    proposal: dict[str, Any] = {
        "agent": "recovery",
        "action": "keep",
        "reason": "Signals look manageable — keep today's plan.",
        "priority": 2,
    }

    if signals.injury_flag:
        proposal = {
            "agent": "recovery",
            "action": "rest",
            "reason": f"Injury flag set ({signals.injury_note or 'unspecified'}). Prioritize recovery.",
            "priority": 1,
            "modifications": {"convert_today_to": "mobility_and_rest"},
        }
    elif signals.sleep <= 4 or signals.energy <= 4 or score <= 4:
        proposal = {
            "agent": "recovery",
            "action": "deload",
            "reason": f"Low recovery (sleep={signals.sleep}, energy={signals.energy}, soreness={signals.soreness}). Soften the session.",
            "priority": 2,
            "modifications": {"intensity": "easy", "duration_factor": 0.6},
        }
    elif signals.soreness >= 8:
        proposal = {
            "agent": "recovery",
            "action": "swap_to_mobility",
            "reason": f"High soreness ({signals.soreness}/10). Swap hard lifts for mobility.",
            "priority": 2,
            "modifications": {"convert_today_to": "mobility"},
        }

    planned_today = 0
    if plan:
        planned_today = sum(1 for s in plan.sessions if s.status.value == "planned")
    proposal["inputs"] = {
        "sleep": signals.sleep,
        "energy": signals.energy,
        "soreness": signals.soreness,
        "injury_flag": signals.injury_flag,
        "planned_remaining": planned_today,
    }
    return proposal
