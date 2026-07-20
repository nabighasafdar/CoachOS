from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents import run_accountability, run_adaptation, run_nutrition, run_planner
from config import get_settings
from schemas.state import (
    AccountabilityRequest,
    AdaptRequest,
    LogCheckInRequest,
    LogMealRequest,
    LogWorkoutRequest,
    PlanRequest,
    SessionStatus,
    SetCalorieTargetRequest,
    UpsertProfileRequest,
    UserProfile,
    NutritionState,
)
from store.db import store
from tools.health import get_health_client

scheduler = AsyncIOScheduler()


async def _weekly_accountability_job() -> None:
    await run_accountability(None)


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler.add_job(_weekly_accountability_job, "cron", day_of_week="mon", hour=9, minute=0, id="accountability")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="CoachOS API", version="0.1.0", lifespan=lifespan)
settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_user(user_id: str) -> UserProfile:
    profile = store.get_user(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found. Upsert profile first.")
    return profile


@app.get("/health")
async def health():
    return {"ok": True, "service": "coachos-api", "store": store.snapshot()}


@app.post("/profile")
async def upsert_profile(body: UpsertProfileRequest):
    saved = store.upsert_user(body.profile)
    return {"profile": saved.model_dump()}


@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    profile = _require_user(user_id)
    return {"profile": profile.model_dump()}


@app.post("/plan")
async def create_plan(body: PlanRequest):
    if body.profile:
        store.upsert_user(body.profile)
        profile = body.profile
    else:
        profile = _require_user(body.user_id)
    plan = await run_planner(profile, force=body.force)
    return {"plan": plan.model_dump(), "decisions": [d.model_dump() for d in store.get_decisions(body.user_id, 5)]}


@app.get("/plan/{user_id}")
async def get_plan(user_id: str):
    plan = store.get_plan(user_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="No plan yet")
    return {"plan": plan.model_dump()}


@app.post("/adapt")
async def adapt(body: AdaptRequest):
    profile = _require_user(body.user_id)
    result = await run_adaptation(
        profile,
        trigger=body.trigger,
        signals=body.signals,
        skipped_session_id=body.skipped_session_id,
    )
    return result


@app.post("/log/workout")
async def log_workout(body: LogWorkoutRequest):
    profile = _require_user(body.user_id)
    plan = store.get_plan(body.user_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="No plan")
    found = False
    for s in plan.sessions:
        if s.id == body.session_id:
            s.status = body.status
            s.notes = body.notes or s.notes
            found = True
            if body.status == SessionStatus.skipped:
                store.record_skip(body.user_id, s.day, s.title)
            break
    if not found:
        raise HTTPException(status_code=404, detail="Session not found")
    store.set_plan(plan)

    adapt_result = None
    if body.status == SessionStatus.skipped:
        adapt_result = await run_adaptation(
            profile, trigger="missed_workout", skipped_session_id=body.session_id
        )
    return {"plan": plan.model_dump(), "adaptation": adapt_result}


@app.post("/log/checkin")
async def log_checkin(body: LogCheckInRequest):
    profile = _require_user(body.user_id)
    signals = body.signals
    signals.user_id = body.user_id
    store.set_signals(signals)
    get_health_client().save(signals)

    adapt_result = None
    if signals.sleep <= 4 or signals.energy <= 4 or signals.injury_flag or signals.soreness >= 8:
        adapt_result = await run_adaptation(
            profile,
            trigger="low_recovery" if not signals.injury_flag else "injury_flag",
            signals=signals,
        )
    return {"signals": signals.model_dump(), "adaptation": adapt_result}


@app.post("/log/meal")
async def log_meal(body: LogMealRequest):
    _require_user(body.user_id)
    result = await run_nutrition(
        body.user_id,
        description=body.description,
        pantry=body.pantry,
        photo_base64=body.photo_base64,
        meal_slot=body.meal_slot,
        meal_label=body.meal_label,
    )
    from schemas.state import AgentName, DecisionLogEntry
    import uuid

    store.add_decision(
        DecisionLogEntry(
            id=uuid.uuid4().hex[:12],
            user_id=body.user_id,
            agent=AgentName.nutrition,
            action=result["action"],
            reason=result["reason"],
            inputs={
                "description": body.description,
                "has_photo": bool(body.photo_base64),
                "identify": result.get("identify"),
                "macros": result.get("macros"),
                "remaining_kcal": result.get("remaining_kcal"),
                "pantry": body.pantry,
                "meal_slot": body.meal_slot,
                "meal_label": body.meal_label,
            },
        )
    )
    return result


@app.get("/activity/{user_id}")
async def activity(user_id: str, limit: int = 50):
    _require_user(user_id)
    return {"decisions": [d.model_dump() for d in store.get_decisions(user_id, limit)]}


@app.get("/nutrition/{user_id}")
async def nutrition(user_id: str):
    _require_user(user_id)
    state = store.get_nutrition(user_id, date.today().isoformat())
    return {"nutrition": state.model_dump() if state else None}


@app.post("/nutrition/target")
async def set_calorie_target(body: SetCalorieTargetRequest):
    """Save weekly daily calorie target on the profile and today's nutrition state."""
    profile = _require_user(body.user_id)
    profile.daily_calorie_target = body.calorie_target
    store.upsert_user(profile)

    today = date.today().isoformat()
    state = store.get_nutrition(body.user_id, today) or NutritionState(
        user_id=body.user_id,
        date=today,
        calorie_target=body.calorie_target,
    )
    state.calorie_target = body.calorie_target
    eaten = sum(m.calories or 0 for m in state.meals)
    remaining = max(state.calorie_target - eaten, 0)
    state.suggestions = [
        f"Weekly calorie plan set to {body.calorie_target} kcal/day.",
        f"~{remaining} kcal left today — Nutrition Agent will balance later meals if one meal runs high.",
    ]
    store.set_nutrition(state)

    from schemas.state import AgentName, DecisionLogEntry
    import uuid

    store.add_decision(
        DecisionLogEntry(
            id=uuid.uuid4().hex[:12],
            user_id=body.user_id,
            agent=AgentName.nutrition,
            action="set_calorie_target",
            reason=(
                f"Daily calorie target set to {body.calorie_target} kcal. "
                "If most calories are eaten in one meal, later meals get lighter recommendations."
            ),
            inputs={"calorie_target": body.calorie_target},
        )
    )
    return {"profile": profile.model_dump(), "nutrition": state.model_dump()}


@app.post("/accountability/run")
async def accountability_run(body: AccountabilityRequest):
    if body.secret != settings.accountability_secret:
        raise HTTPException(status_code=401, detail="Invalid secret")
    nudges = await run_accountability(body.user_id)
    return {"nudges": nudges}


@app.post("/demo/seed")
async def seed_demo():
    """Seed a demo user with canned history for portfolio demos."""
    from datetime import timedelta
    import uuid
    from schemas.state import DecisionLogEntry, AgentName, WeeklyPlan, WorkoutSession

    user_id = "demo-user"
    profile = UserProfile(
        user_id=user_id,
        display_name="Demo Athlete",
        email="demo@coachos.app",
        goals=["strength", "consistency"],
        equipment=["dumbbells", "pull-up bar"],
        injuries=[],
        available_days=["mon", "wed", "fri"],
        experience_level="intermediate",
        onboarding_complete=True,
    )
    store.upsert_user(profile)
    plan = await run_planner(profile, force=True)

    # Fake skip history for accountability patterns
    for _ in range(3):
        store.record_skip(user_id, "mon", "MON · Lower Strength")

    store.add_decision(
        DecisionLogEntry(
            id=uuid.uuid4().hex[:12],
            user_id=user_id,
            agent=AgentName.accountability,
            action="pattern_detected",
            reason="Seeded history: Monday lower sessions skipped 3×.",
            inputs={"day": "mon", "count": 3},
        )
    )
    return {
        "profile": profile.model_dump(),
        "plan": plan.model_dump(),
        "hint": "Use user_id=demo-user. Try POST /log/checkin with sleep=3 then GET /activity/demo-user",
    }
