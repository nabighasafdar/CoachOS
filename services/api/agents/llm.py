from __future__ import annotations

import json
import re
from typing import Any, Optional

from config import get_settings


def _extract_json(text: str) -> Optional[Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
    return None


async def llm_json(prompt: str, *, model: str = "llama-3.1-8b-instant") -> Optional[Any]:
    """Call Groq for JSON; return None on failure so callers can use heuristics."""
    settings = get_settings()
    if not settings.groq_api_key:
        return None
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatGroq(api_key=settings.groq_api_key, model=model, temperature=0.2)
        result = await llm.ainvoke(
            [
                SystemMessage(content="Reply with valid JSON only. No markdown."),
                HumanMessage(content=prompt),
            ]
        )
        return _extract_json(str(result.content))
    except Exception:
        # Gemini Flash-Lite fallback
        if not settings.gemini_api_key:
            return None
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            model_g = genai.GenerativeModel("gemini-2.0-flash-lite")
            result = model_g.generate_content(prompt + "\n\nRespond with JSON only.")
            return _extract_json(result.text or "")
        except Exception:
            return None


async def llm_text(prompt: str, *, model: str = "llama-3.1-8b-instant") -> Optional[str]:
    settings = get_settings()
    if not settings.groq_api_key:
        return None
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage

        llm = ChatGroq(api_key=settings.groq_api_key, model=model, temperature=0.3)
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        return str(result.content).strip()
    except Exception:
        return None
