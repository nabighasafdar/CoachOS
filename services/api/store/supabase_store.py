from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from schemas.state import (
    DailySignals,
    DecisionLogEntry,
    NutritionState,
    UserProfile,
    WeeklyPlan,
)


class SupabaseStore:
    """Supabase Postgres-backed store. Mirrors DataStore's interface.

    Uses the service_role key, so it bypasses RLS. Each row stores the Pydantic
    model dump in a `data` jsonb column for a 1:1 mapping with the JSON store.
    """

    def __init__(self, url: str, service_role_key: str) -> None:
        self.client: Client = create_client(url, service_role_key)

    # users -----------------------------------------------------------------
    def upsert_user(self, profile: UserProfile) -> UserProfile:
        self.client.table("profiles").upsert(
            {"user_id": profile.user_id, "data": profile.model_dump()}
        ).execute()
        return profile

    def get_user(self, user_id: str) -> Optional[UserProfile]:
        res = self.client.table("profiles").select("data").eq("user_id", user_id).limit(1).execute()
        if res.data:
            return UserProfile.model_validate(res.data[0]["data"])
        return None

    # plans -----------------------------------------------------------------
    def set_plan(self, plan: WeeklyPlan) -> WeeklyPlan:
        self.client.table("plans").upsert(
            {"user_id": plan.user_id, "data": plan.model_dump()}
        ).execute()
        return plan

    def get_plan(self, user_id: str) -> Optional[WeeklyPlan]:
        res = self.client.table("plans").select("data").eq("user_id", user_id).limit(1).execute()
        if res.data:
            return WeeklyPlan.model_validate(res.data[0]["data"])
        return None

    # signals ---------------------------------------------------------------
    def set_signals(self, signals: DailySignals) -> DailySignals:
        key = f"{signals.user_id}:{signals.date}"
        self.client.table("signals").upsert(
            {
                "key": key,
                "user_id": signals.user_id,
                "date": str(signals.date),
                "data": signals.model_dump(),
            }
        ).execute()
        return signals

    def get_signals(self, user_id: str, date: str) -> Optional[DailySignals]:
        res = (
            self.client.table("signals")
            .select("data")
            .eq("key", f"{user_id}:{date}")
            .limit(1)
            .execute()
        )
        if res.data:
            return DailySignals.model_validate(res.data[0]["data"])
        return None

    # nutrition -------------------------------------------------------------
    def set_nutrition(self, state: NutritionState) -> NutritionState:
        key = f"{state.user_id}:{state.date}"
        self.client.table("nutrition").upsert(
            {
                "key": key,
                "user_id": state.user_id,
                "date": str(state.date),
                "data": state.model_dump(),
            }
        ).execute()
        return state

    def get_nutrition(self, user_id: str, date: str) -> Optional[NutritionState]:
        res = (
            self.client.table("nutrition")
            .select("data")
            .eq("key", f"{user_id}:{date}")
            .limit(1)
            .execute()
        )
        if res.data:
            return NutritionState.model_validate(res.data[0]["data"])
        return None

    # decisions -------------------------------------------------------------
    def add_decision(self, entry: DecisionLogEntry) -> DecisionLogEntry:
        self.client.table("decisions").insert(
            {"user_id": entry.user_id, "data": entry.model_dump()}
        ).execute()
        return entry

    def get_decisions(self, user_id: str, limit: int = 50) -> list[DecisionLogEntry]:
        res = (
            self.client.table("decisions")
            .select("data")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [DecisionLogEntry.model_validate(row["data"]) for row in (res.data or [])]

    # skip history ----------------------------------------------------------
    def record_skip(self, user_id: str, day: str, title: str) -> None:
        self.client.table("skip_history").insert(
            {"user_id": user_id, "day": day, "title": title}
        ).execute()

    def get_skip_history(self, user_id: str) -> list[dict]:
        res = (
            self.client.table("skip_history")
            .select("day,title")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [{"day": r["day"], "title": r["title"]} for r in (res.data or [])]

    # misc ------------------------------------------------------------------
    def all_user_ids(self) -> list[str]:
        res = self.client.table("profiles").select("user_id").execute()
        return [r["user_id"] for r in (res.data or [])]

    def snapshot(self) -> dict:
        def count(table: str) -> int:
            res = self.client.table(table).select("*", count="exact").limit(1).execute()
            return res.count or 0

        return {
            "backend": "supabase",
            "users": count("profiles"),
            "plans": count("plans"),
            "decisions": count("decisions"),
        }
