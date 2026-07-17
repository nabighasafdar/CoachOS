from __future__ import annotations

from abc import ABC, abstractmethod

from schemas.state import DailySignals


class HealthClient(ABC):
    @abstractmethod
    async def get_signals(self, user_id: str, date: str) -> DailySignals:
        raise NotImplementedError


class MockHealthClient(HealthClient):
    """Manual check-ins are the source of truth; mock fills gaps."""

    def __init__(self) -> None:
        self._cache: dict[str, DailySignals] = {}

    def save(self, signals: DailySignals) -> None:
        key = f"{signals.user_id}:{signals.date}"
        self._cache[key] = signals

    async def get_signals(self, user_id: str, date: str) -> DailySignals:
        key = f"{user_id}:{date}"
        if key in self._cache:
            return self._cache[key]
        return DailySignals(user_id=user_id, date=date)


_health_singleton = MockHealthClient()


def get_health_client() -> MockHealthClient:
    return _health_singleton
