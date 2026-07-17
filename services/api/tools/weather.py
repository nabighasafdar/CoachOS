from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

import httpx

from config import get_settings


class WeatherClient(ABC):
    @abstractmethod
    async def forecast(self, lat: float, lon: float) -> dict:
        raise NotImplementedError


class MockWeatherClient(WeatherClient):
    async def forecast(self, lat: float, lon: float) -> dict:
        return {
            "summary": "Partly cloudy",
            "precip_mm": 0.2,
            "temp_c": 22.0,
            "source": "mock",
            "lat": lat,
            "lon": lon,
        }


class OpenMeteoWeatherClient(WeatherClient):
    async def forecast(self, lat: float, lon: float) -> dict:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation",
            "daily": "precipitation_sum",
            "timezone": "auto",
            "forecast_days": 1,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        precip = float((data.get("daily") or {}).get("precipitation_sum", [0])[0] or 0)
        current = data.get("current") or {}
        temp = float(current.get("temperature_2m") or 20)
        summary = "Rain likely" if precip >= 2.0 else "Clear enough for outdoors"
        return {
            "summary": summary,
            "precip_mm": precip,
            "temp_c": temp,
            "source": "open-meteo",
            "lat": lat,
            "lon": lon,
        }


def get_weather_client() -> WeatherClient:
    settings = get_settings()
    if settings.use_mock_tools:
        return MockWeatherClient()
    return OpenMeteoWeatherClient()
