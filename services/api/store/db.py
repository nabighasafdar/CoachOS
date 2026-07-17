from __future__ import annotations

import json
import threading
from copy import deepcopy
from pathlib import Path
from typing import Optional

from schemas.state import (
    DailySignals,
    DecisionLogEntry,
    NutritionState,
    UserProfile,
    WeeklyPlan,
)


class DataStore:
    """In-memory store with JSON file persistence. Used as a fallback when
    Supabase is not configured (see SupabaseStore)."""

    def __init__(self, path: str = "./data/store.json") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.users: dict[str, UserProfile] = {}
        self.plans: dict[str, WeeklyPlan] = {}
        self.signals: dict[str, DailySignals] = {}
        self.nutrition: dict[str, NutritionState] = {}
        self.decisions: dict[str, list[DecisionLogEntry]] = {}
        self.skip_history: dict[str, list[dict]] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        raw = json.loads(self.path.read_text())
        self.users = {k: UserProfile.model_validate(v) for k, v in raw.get("users", {}).items()}
        self.plans = {k: WeeklyPlan.model_validate(v) for k, v in raw.get("plans", {}).items()}
        self.signals = {k: DailySignals.model_validate(v) for k, v in raw.get("signals", {}).items()}
        self.nutrition = {k: NutritionState.model_validate(v) for k, v in raw.get("nutrition", {}).items()}
        self.decisions = {
            k: [DecisionLogEntry.model_validate(d) for d in v]
            for k, v in raw.get("decisions", {}).items()
        }
        self.skip_history = raw.get("skip_history", {})

    def _save(self) -> None:
        payload = {
            "users": {k: v.model_dump() for k, v in self.users.items()},
            "plans": {k: v.model_dump() for k, v in self.plans.items()},
            "signals": {k: v.model_dump() for k, v in self.signals.items()},
            "nutrition": {k: v.model_dump() for k, v in self.nutrition.items()},
            "decisions": {k: [d.model_dump() for d in v] for k, v in self.decisions.items()},
            "skip_history": self.skip_history,
        }
        self.path.write_text(json.dumps(payload, indent=2))

    def upsert_user(self, profile: UserProfile) -> UserProfile:
        with self._lock:
            self.users[profile.user_id] = profile
            self._save()
            return profile

    def get_user(self, user_id: str) -> Optional[UserProfile]:
        return self.users.get(user_id)

    def set_plan(self, plan: WeeklyPlan) -> WeeklyPlan:
        with self._lock:
            self.plans[plan.user_id] = plan
            self._save()
            return plan

    def get_plan(self, user_id: str) -> Optional[WeeklyPlan]:
        return self.plans.get(user_id)

    def set_signals(self, signals: DailySignals) -> DailySignals:
        with self._lock:
            key = f"{signals.user_id}:{signals.date}"
            self.signals[key] = signals
            self._save()
            return signals

    def get_signals(self, user_id: str, date: str) -> Optional[DailySignals]:
        return self.signals.get(f"{user_id}:{date}")

    def set_nutrition(self, state: NutritionState) -> NutritionState:
        with self._lock:
            key = f"{state.user_id}:{state.date}"
            self.nutrition[key] = state
            self._save()
            return state

    def get_nutrition(self, user_id: str, date: str) -> Optional[NutritionState]:
        return self.nutrition.get(f"{user_id}:{date}")

    def add_decision(self, entry: DecisionLogEntry) -> DecisionLogEntry:
        with self._lock:
            self.decisions.setdefault(entry.user_id, []).insert(0, entry)
            self.decisions[entry.user_id] = self.decisions[entry.user_id][:100]
            self._save()
            return entry

    def get_decisions(self, user_id: str, limit: int = 50) -> list[DecisionLogEntry]:
        return list(self.decisions.get(user_id, [])[:limit])

    def record_skip(self, user_id: str, day: str, title: str) -> None:
        with self._lock:
            self.skip_history.setdefault(user_id, []).append({"day": day, "title": title})
            self._save()

    def get_skip_history(self, user_id: str) -> list[dict]:
        return list(self.skip_history.get(user_id, []))

    def all_user_ids(self) -> list[str]:
        return list(self.users.keys())

    def snapshot(self) -> dict:
        return deepcopy(
            {
                "backend": "json",
                "users": len(self.users),
                "plans": len(self.plans),
                "decisions": sum(len(v) for v in self.decisions.values()),
            }
        )


def _build_store():
    """Use Supabase when configured, otherwise fall back to the JSON store."""
    from config import get_settings

    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_role_key:
        try:
            from store.supabase_store import SupabaseStore

            return SupabaseStore(settings.supabase_url, settings.supabase_service_role_key)
        except Exception as exc:  # pragma: no cover - fall back if client init fails
            print(f"[store] Supabase init failed ({exc}); falling back to JSON store.")
    return DataStore()


store = _build_store()
