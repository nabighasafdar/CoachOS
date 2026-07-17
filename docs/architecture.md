# CoachOS Architecture

## Overview

CoachOS is a multi-agent fitness OS: Expo mobile client + FastAPI/LangGraph-style agent services.

```
Expo app  --HTTP-->  FastAPI (services/api)
                        |
         Adaptation orchestrator
         /      |       \       \
   Planner  Recovery  Nutrition  Accountability
         \      |       /       /
          shared AgentState + decision_log
                        |
              JSON store (+ optional Chroma)
              Mock/Real tool adapters
```

## Conflict priority

1. Injury flag  
2. Recovery proposal  
3. Weather (Open-Meteo / mock)  
4. Planner backlog catch-up  

## Free tools

| Tool | Adapter |
| --- | --- |
| Weather | `tools/weather.py` — Mock or Open-Meteo |
| Health | `tools/health.py` — manual check-ins |
| Food | `tools/food.py` — Mock or Open Food Facts (+ Gemini vision when keyed) |
| LLM | `agents/llm.py` — Groq with Gemini fallback; heuristic if no keys |

## Demo path

1. `POST /demo/seed` or tap **Load demo user** in the app  
2. Log sleep=3 on Log tab → Adaptation runs  
3. Skip a Plan session → Adaptation resolves backlog vs recovery  
4. Open Agents tab → read decision reasons  
5. Run Accountability → Monday-skip pattern nudge  
6. Profile → Demo weather nudge (local Expo notification)

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/profile` | Upsert profile |
| POST | `/plan` | Planner Agent |
| POST | `/adapt` | Adaptation orchestrator |
| POST | `/log/workout` | Mark done/skipped (skip triggers adapt) |
| POST | `/log/checkin` | Daily signals (low recovery triggers adapt) |
| POST | `/log/meal` | Nutrition Agent |
| GET | `/activity/{user_id}` | Decision log |
| POST | `/accountability/run` | Weekly pattern nudges (secret required) |
| POST | `/demo/seed` | Seed demo-user |
