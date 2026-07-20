from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    planned = "planned"
    done = "done"
    skipped = "skipped"
    moved = "moved"


class AgentName(str, Enum):
    planner = "planner"
    recovery = "recovery"
    nutrition = "nutrition"
    adaptation = "adaptation"
    accountability = "accountability"


class UserProfile(BaseModel):
    user_id: str
    display_name: str = ""
    email: str = ""
    goals: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    injuries: list[str] = Field(default_factory=list)
    available_days: list[str] = Field(default_factory=lambda: ["mon", "wed", "fri"])
    experience_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    onboarding_complete: bool = False
    push_token: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    daily_calorie_target: int = 2200


class WorkoutSession(BaseModel):
    id: str
    day: str
    title: str
    focus: str
    exercises: list[str] = Field(default_factory=list)
    duration_min: int = 45
    status: SessionStatus = SessionStatus.planned
    notes: str = ""


class WeeklyPlan(BaseModel):
    user_id: str
    week_start: str
    sessions: list[WorkoutSession] = Field(default_factory=list)
    version: int = 1
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class DailySignals(BaseModel):
    user_id: str
    date: str
    sleep: int = Field(ge=1, le=10, default=7)
    energy: int = Field(ge=1, le=10, default=7)
    soreness: int = Field(ge=1, le=10, default=3)
    injury_flag: bool = False
    injury_note: str = ""
    weather_summary: str = ""
    precip_mm: float = 0.0


class MealLog(BaseModel):
    id: str
    description: str
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    source: Literal["text", "photo", "barcode"] = "text"
    meal_slot: Optional[str] = None
    meal_label: Optional[str] = None
    logged_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class NutritionState(BaseModel):
    user_id: str
    date: str
    calorie_target: int = 2200
    pantry: list[str] = Field(default_factory=list)
    meals: list[MealLog] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class DecisionLogEntry(BaseModel):
    id: str
    user_id: str
    agent: AgentName
    action: str
    reason: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class AgentState(BaseModel):
    """Shared state every agent reads/writes."""

    user_profile: UserProfile
    weekly_plan: Optional[WeeklyPlan] = None
    daily_signals: Optional[DailySignals] = None
    nutrition_state: Optional[NutritionState] = None
    agent_memory: list[str] = Field(default_factory=list)
    decision_log: list[DecisionLogEntry] = Field(default_factory=list)
    trigger: Optional[str] = None
    proposals: dict[str, Any] = Field(default_factory=dict)


class PlanRequest(BaseModel):
    user_id: str
    profile: Optional[UserProfile] = None
    force: bool = False


class AdaptRequest(BaseModel):
    user_id: str
    trigger: str = "manual"
    signals: Optional[DailySignals] = None
    skipped_session_id: Optional[str] = None


class LogWorkoutRequest(BaseModel):
    user_id: str
    session_id: str
    status: SessionStatus
    notes: str = ""


class LogCheckInRequest(BaseModel):
    user_id: str
    signals: DailySignals


class LogMealRequest(BaseModel):
    user_id: str
    description: str
    photo_base64: Optional[str] = None
    pantry: list[str] = Field(default_factory=list)
    meal_slot: Optional[str] = None
    meal_label: Optional[str] = None


class SetCalorieTargetRequest(BaseModel):
    user_id: str
    calorie_target: int = Field(ge=800, le=6000)


class AccountabilityRequest(BaseModel):
    user_id: Optional[str] = None
    secret: Optional[str] = None


class UpsertProfileRequest(BaseModel):
    profile: UserProfile
