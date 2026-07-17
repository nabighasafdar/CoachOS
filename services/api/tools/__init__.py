from __future__ import annotations

from tools.food import get_food_client
from tools.health import get_health_client
from tools.weather import get_weather_client

__all__ = ["get_weather_client", "get_health_client", "get_food_client"]
