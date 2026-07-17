# CoachOS

An autonomous multi-agent fitness OS for people who abandon static workout apps — it adapts your plan to sleep, skips, weather, and soreness, then shows you what each agent decided and why.

## Demo / visuals

No demo video or screenshots yet. Once the multi-agent flow ships, this section will link a short walkthrough (missed workout → Adaptation Agent → Agent Activity Log).

Until then, run the Expo app locally (see [Getting started](#getting-started)) and open the **Home** tab to see the current shell UI.

## What we're building

**Problem.** Most fitness apps (including “AI” ones) hand you a fixed plan and a chatbot. When life happens — bad sleep, a skipped session, rain at run time, a sore knee — the app does not adapt. It nags you to “stay consistent,” which is a big reason people quit within months.

**Solution.** CoachOS is not a chat wrapper. It runs specialized agents that observe signals, decide, act on your plan, and verify outcomes — with a visible decision log so the system is demoable and interview-ready.

1. **Planner Agent** — Builds and adjusts a weekly training plan from goals, equipment, and schedule. *Why it matters:* you get a real plan, not a one-off chatbot reply.
2. **Recovery Agent** — Reads sleep / energy / soreness (manual check-ins first; wearables later) and can soften or rest a day. *Why it matters:* protects against grinding through fatigue.
3. **Nutrition Agent** — Adjusts meal suggestions from what you logged (text first; optional photo via Gemini later). *Why it matters:* nutrition tracks reality, not an ideal fridge.
4. **Adaptation Agent** — Orchestrator that resolves conflicts (e.g. Recovery says rest, Planner says you’re behind) into one coherent update. *Why it matters:* this is the multi-agent problem that makes the project distinctive.
5. **Accountability Agent** — Spots patterns (e.g. always skip Monday legs) and sends one specific nudge, not a generic reminder. *Why it matters:* proactive help without notification spam.
6. **Agent Activity Log** — UI that shows each agent’s action and reasoning. *Why it matters:* makes the agentic architecture visible for demos and interviews.

**Throughline.** Onboard → get a plan → log workouts and check-ins → when something changes, Adaptation re-runs peer agents → you see the new plan and the “why” on Agents → weekly Accountability catches patterns. You rarely chat; the system acts and explains.

## How it works

Target architecture (backend agents are **not implemented yet**; mobile shell exists today):

```
┌─────────────┐     HTTP      ┌──────────────────┐
│  Expo app   │ ────────────► │  FastAPI (planned)│
│  Home/Plan/ │               │  + LangGraph      │
│  Log/Agents │ ◄──────────── │                   │
│  /Profile   │   decisions   └────────┬─────────┘
└─────────────┘                        │
                                       ▼
                         Adaptation Agent (orchestrator)
                    ┌──────────┬───────────┬────────────┐
                    ▼          ▼           ▼            ▼
                Planner   Recovery   Nutrition   Accountability
                    │          │           │            │
                    └──────────┴─────┬─────┴────────────┘
                                     ▼
                    Firestore + decision_log  |  free tools
                    (profiles, plans, logs)  |  Groq / Gemini /
                                             |  Open-Meteo / OFF
```

**Conflict priority (planned policy):** injury flag > recovery advice > weather conflict > planner backlog catch-up.

**Session status buckets (planned):** `planned` → `done` | `skipped` | `moved`.

**Trigger examples (planned):** missed workout, low sleep score, rain at usual outdoor slot, injury flag.

## Tech stack

| Piece | Role |
| --- | --- |
| **Expo ~57 + React Native 0.86** | Cross-platform mobile UI; fast iteration via Expo Go without native builds early on |
| **TypeScript** | Typed screens, navigation params, and shared client types |
| **React Navigation** | Bottom tabs for Home / Plan / Log / Agents / Profile (`src/navigation/`) |
| **Supabase** | Auth (email/password) via `@supabase/supabase-js` in `src/lib/supabase.ts`; Postgres persistence on the backend (free tier) |
| **Axios** | HTTP client for the future FastAPI backend (`src/lib/api.ts`, default `http://localhost:8000`) |
| **Zustand** | Lightweight client profile state (`src/store/appStore.ts`) |
| **expo-notifications / image-picker / location / secure-store** | Declared in `app.json` for push, meal photos, weather location, and secrets — not wired into screens yet |
| **FastAPI + LangGraph** *(planned)* | Python agent orchestration backend under `services/api/` |
| **Groq + Gemini** *(planned)* | Free-tier LLMs for agent reasoning and food-photo vision |
| **Chroma / FAISS** *(planned)* | Local episodic memory for “what worked before” |
| **Open-Meteo + Open Food Facts** *(planned)* | Free weather and food database APIs |
| **APScheduler + n8n** *(planned)* | Weekly Accountability job |

## Status

### Built

- Expo TypeScript app with Auth → Onboarding → main tabs (Home / Plan / Log / Agents / Profile)
- Local auth fallback when Supabase keys are missing; Supabase Auth + Postgres when configured
- FastAPI backend in `services/api` with Planner, Recovery, Nutrition, Adaptation, Accountability agents
- Shared agent state schemas (Pydantic + TypeScript)
- Mock/Real tool adapters for weather, health check-ins, and food lookup
- Decision log API + Agents Activity UI
- APScheduler weekly accountability job + `n8n/accountability.json`
- Expo push permission + local demo weather nudge on Profile
- Demo seed endpoint + `scripts/demo.sh` + `docs/architecture.md`

### Still ahead

- Production Supabase RLS hardening and real wearable / calendar integrations
- Hosted demo (Render) + recorded walkthrough video
- Chroma embeddings in production (`CHROMA_ENABLED=true`)
- Photo meal logging UI wiring to Gemini vision

## Getting started

### Prerequisites

- **Node.js** 20+ (repo developed against Node 24)
- **npm** (comes with Node)
- **Expo Go** on a device, or iOS Simulator / Android Emulator
- **Watchman** on macOS recommended: `brew install watchman`
- Optional later: Supabase project, Groq/Gemini API keys, Python 3.11+ for the backend

### Setup

1. Clone and install mobile deps:

```bash
git clone https://github.com/nabighasafdar/CoachOS.git
cd CoachOS
npm install
cp .env.example .env
```

2. Install and start the API (required for plans / agents):

```bash
npm run api:install
npm run api:dev
```

API listens on `http://localhost:8000` (`GET /health`).

3. (Optional) Fill Supabase keys in `.env` (app auth) and `services/api/.env` (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for persistence). Without them the app uses **local auth**, the backend uses a **JSON file store**, and agents run heuristically (still fully demoable).

4. Start Expo:

```bash
npm start
```

5. Open the app → **Load demo user (API)** on the auth screen, or register → complete onboarding.

6. Portfolio path: Log sleep=3 → Plan skip a session → Agents tab → Profile “Demo weather nudge”. Or run `npm run demo`.

### Environment variables

From [`.env.example`](.env.example) — placeholders only; never commit real values:

| Variable | Required to view UI? | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | No | Supabase project URL (`https://<ref>.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon public key (safe for the client) |
| `EXPO_PUBLIC_API_URL` | No | Agent API base URL (default `http://localhost:8000`) |

Example `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Backend (`services/api/.env`) — the **service_role** key stays server-only:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Service setup

#### Supabase (auth + database, free tier)

1. Go to [supabase.com](https://supabase.com) → **New project** (free plan is enough).
2. **Authentication → Providers → Email** → enable it. For quick demos, turn **Confirm email** off so new accounts can sign in immediately.
3. **SQL Editor** → paste and run [`supabase/migrations/001_coachos_schema.sql`](supabase/migrations/001_coachos_schema.sql) to create tables + RLS.
4. **Project Settings → API** → copy the **Project URL** and **anon public** key into `.env` (`EXPO_PUBLIC_SUPABASE_*`), and the **service_role** key into `services/api/.env` (`SUPABASE_SERVICE_ROLE_KEY`, server-only).
5. Client auth wiring lives in [`src/lib/supabase.ts`](src/lib/supabase.ts); backend persistence in [`services/api/store/supabase_store.py`](services/api/store/supabase_store.py).

#### Agent API / LLMs (not in repo yet)

- Planned backend: FastAPI + LangGraph under `services/api/`.
- Planned free LLM keys: [Groq Console](https://console.groq.com) and [Google AI Studio](https://aistudio.google.com) (Gemini).
- Until that exists, keep `EXPO_PUBLIC_API_URL=http://localhost:8000`; the mobile axios client is ready in [`src/lib/api.ts`](src/lib/api.ts) but nothing calls it from screens yet.

#### Integrations status

| Integration | Status | Without it |
| --- | --- | --- |
| Expo / Node | **Required** | App will not run |
| Supabase | Optional now | Falls back to local auth + JSON store |
| FastAPI agents | Not built | No plan generation / adaptation |
| Groq / Gemini | Not wired | No LLM behavior |
| Wearables / Calendar | Deferred | Manual check-ins planned first |

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start Expo Dev Tools / Metro |
| `npm run android` | Start Expo and open Android |
| `npm run ios` | Start Expo and open iOS simulator |
| `npm run web` | Start Expo in the browser |
| `npm run api:install` | Create `services/api/.venv` and install Python deps |
| `npm run api:dev` | Run FastAPI with reload on port 8000 |
| `npm run demo` | Curl demo path: seed → low-sleep check-in → activity → accountability |

## Project structure

```
CoachOS/
├── App.tsx                      # Root: SafeAreaProvider + RootNavigator
├── index.ts                     # Expo entry; imports gesture-handler
├── app.json                     # Expo config, plugins, permissions
├── babel.config.js              # babel-preset-expo + Reanimated plugin
├── package.json                 # Mobile + helper scripts
├── .env.example                 # Public Expo env template
├── scripts/demo.sh              # End-to-end API demo
├── docs/architecture.md         # Agent architecture notes
├── n8n/accountability.json      # Weekly webhook workflow export
├── services/api/                # FastAPI multi-agent backend
│   ├── main.py                  # Routes + APScheduler
│   ├── agents/                  # planner, recovery, nutrition, adaptation, accountability
│   ├── tools/                   # weather / health / food adapters
│   ├── schemas/state.py         # Shared agent state
│   ├── store/db.py              # Persistent JSON data store
│   └── memory/                  # Episodic recall (file / optional Chroma)
└── src/
    ├── navigation/              # Auth / onboarding / tabs
    ├── screens/                 # Home, Plan, Log, Agents, Profile, Auth, Onboarding
    ├── services/                # coachApi + auth helpers
    ├── lib/                     # supabase + axios
    ├── store/                   # Zustand app state
    └── types/agent.ts           # Mirrors backend schemas
```

### Data model

Backend persists to Supabase Postgres when configured (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), otherwise to `services/api/data/store.json`:

| Table / key | Purpose | Access |
| --- | --- | --- |
| `profiles` | Profile, goals, equipment, injuries | Owner via RLS; API by `user_id` |
| `plans` | Weekly training plans + session status | Owner / API |
| `signals` | Daily recovery check-ins | Owner / API |
| `nutrition` | Meals + pantry suggestions | Owner / API |
| `decisions` | Agent activity / decision_log | Owner read; API write |
| `skip_history` | Pattern input for Accountability | API internal |

## What's next

1. Deploy API to Render free tier and point `EXPO_PUBLIC_API_URL` at it  
2. Tighten Supabase RLS policies for multi-user demos  
3. Record the missed-workout → adapt → Agents log video  
4. Optional: enable `CHROMA_ENABLED=true` and Health Connect / calendar OAuth  
5. Wire meal photo picker to Gemini vision end-to-end 

## Security notes

- Secrets belong in `.env` (gitignored). Never commit real Supabase service_role or LLM keys.
- `EXPO_PUBLIC_*` values are embedded in the client bundle — treat them as public. The Supabase **anon** key is fine there; the **service_role** key must stay server-side in `services/api/.env` only.
- Supabase Auth tokens should authorize API calls; planned cron / n8n endpoints must not be open to the world (shared secret or IAM).
- Keep RLS enabled on all tables before any multi-user or public demo.

## Key risks

| Risk | Mitigation |
| --- | --- |
| Free LLM rate limits (Groq / Gemini) mid-demo | Short prompts, response cache by signal hash, dual-provider fallback |
| Supabase free tier caps | Denormalize carefully; avoid polling; design for decision batches |
| Agents not shipping while UI implies features | Keep screens labeled as placeholders; Agent Activity only after real logs |
| Wearable / HealthKit complexity blocking MVP | Manual check-ins first; Health Connect / HealthKit as stretch |
| Empty Agent Activity is a weak portfolio demo | Seed script + recorded missed-workout → adapt path before sharing |

## License

MIT — see [LICENSE](LICENSE) (Expo template copyright retained until project-specific copyright is updated).

Repository: [github.com/nabighasafdar/CoachOS](https://github.com/nabighasafdar/CoachOS)
