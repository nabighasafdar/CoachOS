"""LangGraph-style orchestration graph for Adaptation.

Uses langgraph StateGraph when available; falls back to sequential calls.
"""

from __future__ import annotations

from typing import Any, TypedDict

from agents.adaptation import run_adaptation
from schemas.state import DailySignals, UserProfile


class GraphState(TypedDict, total=False):
    profile: UserProfile
    trigger: str
    signals: DailySignals | None
    skipped_session_id: str | None
    result: dict[str, Any]


def build_adaptation_graph():
    try:
        from langgraph.graph import END, StateGraph

        async def adapt_node(state: GraphState) -> GraphState:
            result = await run_adaptation(
                state["profile"],
                trigger=state.get("trigger") or "manual",
                signals=state.get("signals"),
                skipped_session_id=state.get("skipped_session_id"),
            )
            return {**state, "result": result}

        graph = StateGraph(GraphState)
        graph.add_node("adapt", adapt_node)
        graph.set_entry_point("adapt")
        graph.add_edge("adapt", END)
        return graph.compile()
    except Exception:
        return None


async def run_adaptation_graph(
    profile: UserProfile,
    trigger: str = "manual",
    signals: DailySignals | None = None,
    skipped_session_id: str | None = None,
) -> dict[str, Any]:
    compiled = build_adaptation_graph()
    if compiled is None:
        return await run_adaptation(profile, trigger, signals, skipped_session_id)
    out = await compiled.ainvoke(
        {
            "profile": profile,
            "trigger": trigger,
            "signals": signals,
            "skipped_session_id": skipped_session_id,
        }
    )
    return out.get("result") or {}
