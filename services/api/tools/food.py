from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any, Optional

import httpx

from config import get_settings


def _strip_base64(photo_base64: str) -> tuple[str, str]:
    """Return (mime_type, raw_base64) from a raw or data-URL base64 string."""
    raw = photo_base64.strip()
    mime = "image/jpeg"
    if raw.startswith("data:") and "," in raw:
        header, raw = raw.split(",", 1)
        match = re.match(r"data:([^;]+)", header)
        if match:
            mime = match.group(1)
    return mime, raw


class FoodClient(ABC):
    @abstractmethod
    async def lookup(self, query: str) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def describe_photo(self, photo_base64: str) -> str:
        raise NotImplementedError

    async def identify_photo(self, photo_base64: str) -> dict[str, Any]:
        """Identify food + portion from a photo. Default: wrap describe_photo."""
        name = await self.describe_photo(photo_base64)
        return {
            "food_name": name,
            "portion": "1 serving",
            "confidence": 0.5,
            "query": name,
        }


class MockFoodClient(FoodClient):
    async def lookup(self, query: str) -> dict:
        q = query.lower()
        if "chicken" in q:
            return {"name": "Chicken breast", "calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6}
        if "rice" in q:
            return {"name": "Cooked rice", "calories": 206, "protein_g": 4.3, "carbs_g": 45, "fat_g": 0.4}
        if "egg" in q:
            return {"name": "Egg", "calories": 78, "protein_g": 6.3, "carbs_g": 0.6, "fat_g": 5.3}
        return {"name": query, "calories": 350, "protein_g": 20, "carbs_g": 30, "fat_g": 12}

    async def describe_photo(self, photo_base64: str) -> str:
        return "Grilled chicken with rice and vegetables"

    async def identify_photo(self, photo_base64: str) -> dict[str, Any]:
        return {
            "food_name": "Grilled chicken with rice and vegetables",
            "portion": "1 plate",
            "confidence": 0.4,
            "query": "1 plate grilled chicken with rice and vegetables",
        }


class PipelineFoodClient(FoodClient):
    """Gemini 2.5 Flash (identify) → API Ninjas Nutrition (macros)."""

    async def identify_photo(self, photo_base64: str) -> dict[str, Any]:
        settings = get_settings()
        if not settings.gemini_api_key:
            return await MockFoodClient().identify_photo(photo_base64)

        mime, raw = _strip_base64(photo_base64)
        prompt = (
            "You are a nutrition vision assistant. Identify the food in this photo and estimate "
            "the portion size and macros. Respond with ONLY valid JSON (no markdown) using this schema:\n"
            '{'
            '"food_name": "short dish name", '
            '"portion": "e.g. 1 plate / 200g / 2 eggs", '
            '"confidence": 0.0, '
            '"query": "portion + food_name string for a nutrition API lookup", '
            '"estimated_calories": 0, '
            '"estimated_protein_g": 0, '
            '"estimated_carbs_g": 0, '
            '"estimated_fat_g": 0'
            "}"
        )
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            result = model.generate_content(
                [
                    prompt,
                    {"mime_type": mime, "data": raw},
                ]
            )
            text = (result.text or "").strip()
            # Strip accidental markdown fences
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)
            data = json.loads(text)
            food_name = str(data.get("food_name") or "Meal").strip()
            portion = str(data.get("portion") or "1 serving").strip()
            query = str(data.get("query") or f"{portion} {food_name}").strip()
            confidence = float(data.get("confidence") or 0.7)
            return {
                "food_name": food_name,
                "portion": portion,
                "confidence": confidence,
                "query": query,
                "estimated_calories": self._num(data.get("estimated_calories")),
                "estimated_protein_g": self._num(data.get("estimated_protein_g")),
                "estimated_carbs_g": self._num(data.get("estimated_carbs_g")),
                "estimated_fat_g": self._num(data.get("estimated_fat_g")),
            }
        except Exception as exc:
            print(f"[food] Gemini identify failed: {exc}")
            return await MockFoodClient().identify_photo(photo_base64)

    async def describe_photo(self, photo_base64: str) -> str:
        identified = await self.identify_photo(photo_base64)
        return str(identified.get("query") or identified.get("food_name") or "Meal")

    async def lookup(self, query: str) -> dict:
        settings = get_settings()
        ninjas_row: dict | None = None

        if settings.api_ninjas_key:
            url = "https://api.api-ninjas.com/v1/nutrition"
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    resp = await client.get(
                        url,
                        params={"query": query},
                        headers={"X-Api-Key": settings.api_ninjas_key},
                    )
                    resp.raise_for_status()
                    rows = resp.json()
                if isinstance(rows, list) and rows:
                    ninjas_row = self._aggregate_ninjas(rows, query)
            except Exception as exc:
                print(f"[food] API Ninjas lookup failed: {exc}")

        if ninjas_row and self._has_usable_macros(ninjas_row):
            return ninjas_row

        # Free-tier Ninjas often returns calories/protein as premium strings —
        # fall back to Open Food Facts, then mock.
        off = await self._open_food_facts(query)
        if off:
            if ninjas_row:
                # Keep carbs/fat from Ninjas when present; prefer OFF calories/protein.
                return {
                    "name": ninjas_row.get("name") or off["name"],
                    "calories": off["calories"],
                    "protein_g": off["protein_g"],
                    "carbs_g": ninjas_row.get("carbs_g") if ninjas_row.get("carbs_g") is not None else off["carbs_g"],
                    "fat_g": ninjas_row.get("fat_g") if ninjas_row.get("fat_g") is not None else off["fat_g"],
                    "source": "api_ninjas+openfoodfacts",
                }
            return off

        return await MockFoodClient().lookup(query)

    @staticmethod
    def _num(value: Any) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return None
        return None

    def _aggregate_ninjas(self, rows: list[dict], query: str) -> dict:
        calories = 0.0
        protein = 0.0
        carbs = 0.0
        fat = 0.0
        names: list[str] = []
        cal_ok = True
        protein_ok = True
        for row in rows:
            names.append(str(row.get("name") or query))
            c = self._num(row.get("calories"))
            p = self._num(row.get("protein_g"))
            cb = self._num(row.get("carbohydrates_total_g"))
            f = self._num(row.get("fat_total_g"))
            if c is None:
                cal_ok = False
            else:
                calories += c
            if p is None:
                protein_ok = False
            else:
                protein += p
            if cb is not None:
                carbs += cb
            if f is not None:
                fat += f
        return {
            "name": " + ".join(names[:3]) if names else query,
            "calories": round(calories) if cal_ok else None,
            "protein_g": round(protein, 1) if protein_ok else None,
            "carbs_g": round(carbs, 1),
            "fat_g": round(fat, 1),
            "items": rows,
            "source": "api_ninjas",
        }

    @staticmethod
    def _has_usable_macros(row: dict) -> bool:
        return row.get("calories") is not None and row.get("protein_g") is not None

    async def _open_food_facts(self, query: str) -> Optional[dict]:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {"search_terms": query, "search_simple": 1, "json": 1, "page_size": 1}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                products = (resp.json() or {}).get("products") or []
            if not products:
                return None
            p = products[0]
            nutriments = p.get("nutriments") or {}
            return {
                "name": p.get("product_name") or query,
                "calories": int(float(nutriments.get("energy-kcal_100g") or 250)),
                "protein_g": float(nutriments.get("proteins_100g") or 10),
                "carbs_g": float(nutriments.get("carbohydrates_100g") or 20),
                "fat_g": float(nutriments.get("fat_100g") or 8),
                "source": "openfoodfacts",
            }
        except Exception as exc:
            print(f"[food] Open Food Facts failed: {exc}")
            return None


def get_food_client() -> FoodClient:
    settings = get_settings()
    if settings.use_mock_tools:
        return MockFoodClient()
    return PipelineFoodClient()
