from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from schemas.state import MealLog, NutritionState
from store.db import store
from tools.food import get_food_client


async def run_nutrition(
    user_id: str,
    description: str,
    pantry: list[str] | None = None,
    photo_base64: str | None = None,
) -> dict[str, Any]:
    food = get_food_client()
    meal_desc = description
    source = "text"
    if photo_base64:
        meal_desc = await food.describe_photo(photo_base64)
        source = "photo"

    info = await food.lookup(meal_desc)
    today = date.today().isoformat()
    state = store.get_nutrition(user_id, today) or NutritionState(
        user_id=user_id, date=today, pantry=pantry or []
    )
    if pantry:
        state.pantry = pantry

    meal = MealLog(
        id=uuid.uuid4().hex[:10],
        description=meal_desc,
        calories=info.get("calories"),
        protein_g=info.get("protein_g"),
        carbs_g=info.get("carbs_g"),
        fat_g=info.get("fat_g"),
        source=source,  # type: ignore[arg-type]
    )
    state.meals.append(meal)

    eaten = sum(m.calories or 0 for m in state.meals)
    remaining = max(state.calorie_target - eaten, 0)
    pantry_bits = state.pantry[:5] or ["eggs", "oats", "frozen veg"]
    state.suggestions = [
        f"~{remaining} kcal left today — build a meal from: {', '.join(pantry_bits)}",
        "Aim for a protein-forward next meal if today's protein looks light.",
    ]
    store.set_nutrition(state)

    return {
        "agent": "nutrition",
        "action": "logged_meal_and_suggested",
        "reason": f"Logged '{meal_desc}' (~{meal.calories} kcal). Suggested pantry-aware next meal.",
        "meal": meal.model_dump(),
        "nutrition_state": state.model_dump(),
        "priority": 4,
    }
