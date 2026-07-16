# CoachOS

An autonomous multi-agent fitness operating system. Instead of a static workout plan plus a chatbot, CoachOS runs specialized agents that observe your signals, decide what to change, act on your plan, and explain why.

## Why CoachOS

Most fitness apps ignore real life — bad sleep, missed workouts, rain, soreness. CoachOS adapts:

| Agent | Role |
| --- | --- |
| **Planner** | Builds and adjusts the weekly training plan |
| **Recovery** | Reads sleep / energy / soreness and may soften or rest a day |
| **Nutrition** | Adjusts meal suggestions from logs (and optional food photos) |
| **Adaptation** | Orchestrator — resolves conflicts between agents into one coherent plan |
| **Accountability** | Spots skip patterns and sends one specific, non-generic nudge |

## Free stack

Built to stay on free tiers during development:

| Layer | Choice |
| --- | --- |
| Mobile | React Native (Expo) |
| Auth / DB | Firebase Spark (Auth + Firestore) |
| Agents | FastAPI + LangGraph (coming in `services/api`) |
| LLMs | [Groq](https://console.groq.com) (agent calls) + [Gemini](https://aistudio.google.com) (vision) |
| Memory | Local Chroma / FAISS |
| Weather | [Open-Meteo](https://open-meteo.com) |
| Food DB | [Open Food Facts](https://world.openfoodfacts.org) |
| Push | Expo Notifications |
| Jobs | APScheduler + optional n8n webhook |

## Current status

- Expo TypeScript app scaffolded
- Tab navigation: Home · Plan · Log · Agents · Profile
- Firebase + API client stubs ready for keys
- Backend agents not started yet (Phase 0+)

## Prerequisites

- Node.js 20+ (project tested on Node 24)
- npm
- [Expo Go](https://expo.dev/go) on a phone, or iOS Simulator / Android Emulator
- Watchman recommended on macOS (`brew install watchman`)

## Getting started

```bash
git clone https://github.com/nabighasafdar/CoachOS.git
cd CoachOS
npm install
cp .env.example .env
npm start
```

Then press `i` (iOS), `a` (Android), or scan the QR code with Expo Go.

### Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in Firebase + API values when ready:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Never commit real `.env` files.

## Project structure

```
CoachOS/
├── App.tsx                 # Root app shell
├── src/
│   ├── navigation/         # Tab navigator
│   ├── screens/            # Home, Plan, Log, Agents, Profile
│   ├── lib/                # Firebase + API clients
│   └── store/              # Zustand app state
├── services/api/           # Planned: FastAPI + LangGraph agents
├── n8n/                    # Planned: weekly accountability workflow
├── .env.example
└── package.json
```

## Roadmap

1. **Foundation** — Firebase Auth, onboarding, check-ins, shared agent state schema  
2. **Planner MVP** — LangGraph planner, weekly plan, mark done/skipped  
3. **Multi-agent** — Recovery, Nutrition, Adaptation orchestrator, Agent Activity Log  
4. **Proactive** — Accountability job + contextual push notifications  
5. **Demo polish** — Seeded demo user and portfolio walkthrough  

## License

See [LICENSE](LICENSE).
