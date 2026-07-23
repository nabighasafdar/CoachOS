from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from schemas.state import MealLog, NutritionState
from store.db import store
from tools.food import get_food_client

# If one meal uses this share (or more) of the daily target, recommend lighter next meals.
MAJORITY_SHARE = 0.45


def _item_from_row(row: dict[str, Any]) -> dict[str, Any]:
    name = str(row.get("name") or row.get("food_name") or "Item")
    return {
        "name": name,
        "portion": row.get("portion"),
        "calories": round(float(row.get("calories") or row.get("estimated_calories") or 0)),
        "protein_g": round(float(row.get("protein_g") or row.get("estimated_protein_g") or 0), 1),
        "carbs_g": round(float(row.get("carbs_g") or row.get("carbohydrates_total_g") or row.get("estimated_carbs_g") or 0), 1),
        "fat_g": round(float(row.get("fat_g") or row.get("fat_total_g") or row.get("estimated_fat_g") or 0), 1),
    }


def _identified_items(identify: dict[str, Any] | None, info: dict[str, Any], meal_desc: str) -> list[dict[str, Any]]:
    if identify and isinstance(identify.get("items"), list) and identify["items"]:
        return [_item_from_row(item) for item in identify["items"]]
    if isinstance(info.get("items"), list) and info["items"]:
        return [_item_from_row(item) for item in info["items"]]
    return [
        _item_from_row(
            {
                "name": info.get("name") or (identify or {}).get("food_name") or meal_desc,
                "portion": (identify or {}).get("portion"),
                "calories": info.get("calories") or (identify or {}).get("estimated_calories"),
                "protein_g": info.get("protein_g") or (identify or {}).get("estimated_protein_g"),
                "carbs_g": info.get("carbs_g") or (identify or {}).get("estimated_carbs_g"),
                "fat_g": info.get("fat_g") or (identify or {}).get("estimated_fat_g"),
            }
        )
    ]


def _next_meal_budget(target: int, eaten: int, last_meal_kcal: int) -> tuple[str, list[str]]:
    """Return (primary tip, extra suggestion lines) after a meal log."""
    remaining = max(target - eaten, 0)
    pantry_bits = ["eggs", "oats", "frozen veg", "greek yogurt", "chicken"]
    share = (last_meal_kcal / target) if target else 0
    tips: list[str] = [f"~{remaining} kcal left of {target} kcal target today."]

    if share >= MAJORITY_SHARE and remaining > 0:
        # Majority of the day burned in one sitting — manage the rest tightly.
        soft_cap = max(150, min(remaining, int(target * 0.2)))
        tips.append(
            f"You used ~{int(share * 100)}% of today’s calories in one meal "
            f"({last_meal_kcal} kcal). For your next meal, stay near ~{soft_cap} kcal."
        )
        tips.append(
            f"Next meal idea (~{soft_cap} kcal): egg whites + veggies, greek yogurt, "
            f"or a small chicken salad from: {', '.join(pantry_bits[:4])}."
        )
        if remaining < soft_cap:
            tips.append("You’re close to the daily limit — prefer a protein-only snack or stop for now.")
    elif remaining >= 400:
        tips.append(f"Build a ~{min(remaining, 550)} kcal meal from: {', '.join(pantry_bits[:4])}")
    elif remaining >= 150:
        tips.append(f"Light next meal (~{remaining} kcal) from: {', '.join(pantry_bits[:3])}")
    else:
        tips.append("Near daily calorie target — prefer a protein-only snack or stop eating for now.")

    return tips[0], tips[1:]


async def run_nutrition(
    user_id: str,
    description: str,
    pantry: list[str] | None = None,
    photo_base64: str | None = None,
    meal_slot: str | None = None,
    meal_label: str | None = None,
) -> dict[str, Any]:
    food = get_food_client()
    meal_desc = description.strip() if description else ""
    source = "text"
    identify: dict[str, Any] | None = None

    if photo_base64:
        identify = await food.identify_photo(photo_base64)
        meal_desc = str(identify.get("food_name") or identify.get("query") or meal_desc or "Meal")
        source = "photo"
    elif not meal_desc:
        meal_desc = "Meal"

    lookup_query = ""
    if identify and identify.get("query"):
        lookup_query = str(identify["query"])
    info = await food.lookup(lookup_query or meal_desc)
    # When API Ninjas free tier hides calories and OFF fails, use Gemini estimates.
    if (
        identify
        and identify.get("estimated_calories") is not None
        and not info.get("source")
    ):
        info = {
            "name": identify.get("food_name") or meal_desc,
            "calories": round(float(identify["estimated_calories"])),
            "protein_g": round(float(identify.get("estimated_protein_g") or 20), 1),
            "carbs_g": round(float(identify.get("estimated_carbs_g") or 30), 1),
            "fat_g": round(float(identify.get("estimated_fat_g") or 12), 1),
            "source": "gemini_estimate",
        }

    profile = store.get_user(user_id)
    preferred_target = (profile.daily_calorie_target if profile else None) or 2200

    today = date.today().isoformat()
    state = store.get_nutrition(user_id, today) or NutritionState(
        user_id=user_id,
        date=today,
        pantry=pantry or [],
        calorie_target=preferred_target,
    )
    if pantry:
        state.pantry = pantry
    # Keep target aligned with weekly calorie plan from profile.
    if profile and profile.daily_calorie_target:
        state.calorie_target = profile.daily_calorie_target

    items = _identified_items(identify, info, meal_desc)

    meal = MealLog(
        id=uuid.uuid4().hex[:10],
        description=meal_desc,
        calories=info.get("calories"),
        protein_g=info.get("protein_g"),
        carbs_g=info.get("carbs_g"),
        fat_g=info.get("fat_g"),
        source=source,  # type: ignore[arg-type]
        meal_slot=meal_slot,
        meal_label=meal_label,
        items=items,
    )
    state.meals.append(meal)

    eaten = sum(m.calories or 0 for m in state.meals)
    protein_eaten = sum(m.protein_g or 0 for m in state.meals)
    remaining = max(state.calorie_target - eaten, 0)
    last_kcal = int(meal.calories or 0)

    headline, extras = _next_meal_budget(state.calorie_target, eaten, last_kcal)
    protein_tip = (
        "Protein looks solid today."
        if protein_eaten >= 80
        else f"Protein so far ~{int(protein_eaten)}g — prioritize eggs/chicken/greek yogurt next."
    )

    state.suggestions = [headline, *extras, protein_tip]
    store.set_nutrition(state)

    portion = (identify or {}).get("portion")
    slot_bit = f"{meal_label or meal_slot}" if (meal_label or meal_slot) else None
    reason_bits = []
    if slot_bit:
        reason_bits.append(f"{slot_bit}")
    reason_bits.append(f"Logged '{meal_desc}'")
    if portion:
        reason_bits.append(f"portion≈{portion}")
    reason_bits.append(f"~{meal.calories} kcal / {meal.protein_g}g protein")
    if extras:
        reason_bits.append(extras[0])
    else:
        reason_bits.append(headline)

    majority = (last_kcal / state.calorie_target) >= MAJORITY_SHARE if state.calorie_target else False

    return {
        "agent": "nutrition",
        "action": "logged_meal_and_suggested",
        "reason": ". ".join(reason_bits),
        "meal": meal.model_dump(),
        "nutrition_state": state.model_dump(),
        "identify": identify,
        "identified_items": items,
        "daily_totals": {
            "calories": eaten,
            "protein_g": round(protein_eaten, 1),
            "carbs_g": round(sum(m.carbs_g or 0 for m in state.meals), 1),
            "fat_g": round(sum(m.fat_g or 0 for m in state.meals), 1),
            "meal_count": len(state.meals),
        },
        "macros": {
            "calories": info.get("calories"),
            "protein_g": info.get("protein_g"),
            "carbs_g": info.get("carbs_g"),
            "fat_g": info.get("fat_g"),
        },
        "remaining_kcal": remaining,
        "meal_slot": meal_slot,
        "meal_label": meal_label,
        "majority_meal": majority,
        "suggestions": state.suggestions,
        "priority": 4,
    }
