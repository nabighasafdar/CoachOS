from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

import httpx

from config import get_settings


class FoodClient(ABC):
    @abstractmethod
    async def lookup(self, query: str) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def describe_photo(self, photo_base64: str) -> str:
        raise NotImplementedError


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


class OpenFoodFactsClient(FoodClient):
    async def lookup(self, query: str) -> dict:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {"search_terms": query, "search_simple": 1, "json": 1, "page_size": 1}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                products = (resp.json() or {}).get("products") or []
            if not products:
                return await MockFoodClient().lookup(query)
            p = products[0]
            nutriments = p.get("nutriments") or {}
            return {
                "name": p.get("product_name") or query,
                "calories": int(nutriments.get("energy-kcal_100g") or 250),
                "protein_g": float(nutriments.get("proteins_100g") or 10),
                "carbs_g": float(nutriments.get("carbohydrates_100g") or 20),
                "fat_g": float(nutriments.get("fat_100g") or 8),
            }
        except Exception:
            return await MockFoodClient().lookup(query)

    async def describe_photo(self, photo_base64: str) -> str:
        settings = get_settings()
        if not settings.gemini_api_key:
            return await MockFoodClient().describe_photo(photo_base64)
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            result = model.generate_content(
                [
                    "Describe this meal in one short phrase for nutrition logging.",
                    {"mime_type": "image/jpeg", "data": photo_base64},
                ]
            )
            return (result.text or "Meal").strip()
        except Exception:
            return await MockFoodClient().describe_photo(photo_base64)


def get_food_client() -> FoodClient:
    settings = get_settings()
    if settings.use_mock_tools:
        return MockFoodClient()
    return OpenFoodFactsClient()
