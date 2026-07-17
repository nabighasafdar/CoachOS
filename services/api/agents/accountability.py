from __future__ import annotations

import uuid
from collections import Counter
from typing import Any

from schemas.state import AgentName, DecisionLogEntry
from store.db import store


async def run_accountability(user_id: str | None = None) -> list[dict[str, Any]]:
    """Scan skip patterns and emit one specific nudge per user."""
    ids = [user_id] if user_id else store.all_user_ids()
    results: list[dict[str, Any]] = []

    for uid in ids:
        history = store.get_skip_history(uid)
        if not history:
            nudge = {
                "user_id": uid,
                "action": "encourage_logging",
                "message": "No skip pattern yet — keep logging sessions so I can spot useful fixes.",
            }
        else:
            day_counts = Counter(h.get("day", "?") for h in history)
            top_day, count = day_counts.most_common(1)[0]
            title_counts = Counter(h.get("title", "workout") for h in history)
            top_title = title_counts.most_common(1)[0][0]
            # Specific, non-generic nudge
            alt_day = {
                "mon": "Tuesday 7pm",
                "tue": "Wednesday 7pm",
                "wed": "Thursday 7pm",
                "thu": "Friday 6pm",
                "fri": "Saturday morning",
                "sat": "Sunday morning",
                "sun": "Monday evening",
            }.get(str(top_day).lower()[:3], "a different day this week")
            nudge = {
                "user_id": uid,
                "action": "reschedule_suggestion",
                "message": (
                    f"You skipped {top_day.upper()} sessions {count}× "
                    f"(often '{top_title}'). Want me to move that block to {alt_day} instead?"
                ),
                "pattern": {"day": top_day, "count": count, "title": top_title},
            }

        store.add_decision(
            DecisionLogEntry(
                id=uuid.uuid4().hex[:12],
                user_id=uid,
                agent=AgentName.accountability,
                action=nudge["action"],
                reason=nudge["message"],
                inputs=nudge.get("pattern") or {},
            )
        )
        results.append(nudge)
    return results
