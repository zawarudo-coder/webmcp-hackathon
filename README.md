# Security Lab Canvas — WebMCP Cybersecurity Learning

## What is it?
Security Lab Canvas is a **WebMCP-powered web app** built for the OpenAI WebMCP Challenge. It's an interactive cybersecurity learning environment covering the **OWASP Top 10**, where a **human learner** and an **AI security tutor agent** co-learn on a shared canvas in real time.

## Why WebMCP
WebMCP lets the browser become a **tool-use host**: an AI agent (in ChatGPT's desktop browser or Chrome 149+) can reach into the live page, read the learner's progress, generate targeted quiz questions, and explain mistakes — acting as a true AI security tutor, not a distant API.

## How it works
1. **Human** places notes on the canvas describing security concepts (e.g., "Injection Attacks").
2. **AI Agent** calls `list_notes` → reads the canvas, sees what the human is studying.
3. **Agent** calls `generate_question("Injection Attacks", "medium")` → creates a quiz question on-canvas.
4. **Human** answers via `check_answer` → agent evaluates correctness, tracks mastery.
5. **Agent** calls `explain_mistake` → explains why the answer was wrong in plain language.
6. **Agent** calls `get_weak_areas` → finds concepts to review, generates flashcards.
7. **Human + Agent** iterate live — human refines understanding, agent adapts difficulty.

## WebMCP tools registered (11 total)
| Tool | Description |
|---|---|
| `add_note` | Add a security concept note to the canvas with creator tracking |
| `list_notes` | List all notes with identity metadata |
| `generate_question` | Agent generates a quiz question on a concept |
| `check_answer` | Human submits answer; agent evaluates + tracks progress |
| `explain_mistake` | Agent explains why an answer was wrong |
| `get_progress` | Read mastery stats per creator |
| `get_weak_areas` | Find concepts the learner struggles with |
| `create_flashcard_set` | Batch-generate study flashcards |
| `clear_canvas` | Reset the canvas |
| `snapshot` | Export full state + reasoning trace |
| `list_tools` | Discover all available tools |

## WebMCP resources
| URI | Description |
|---|---|
| `resource://securitylab/state` | Full state: notes, concepts, questions, identities, progress |
| `resource://securitylab/concepts` | Available OWASP Top 10 learning concepts |
| `resource://securitylab/identities/{creatorId}` | Contributor identity + contribution history |

## Innovations
- **Identity Graph**: tracks each learner's mastery per-concept, adapts question difficulty
- **Live Tool Discovery**: `list_tools` lets any agent auto-discover available capabilities
- **Reasoning Trace**: `snapshot` exports full canvas + quiz results for judging transparency
- **Offline-First PWA**: Service Worker caches assets; canvas works offline, syncs on reconnect
- **Real-time sync**: BroadcastChannel + StorageEvent keeps tabs/agents in sync

## Architecture
```
securitylab/
├── index.html          # Page shell
├── app.js              # WebMCP registration + logic (all tools/resources)
├── style.css           # Security-themed dark UI
├── sw.js               # Service Worker (offline-first)
├── manifest.json       # PWA manifest
├── LICENSE             # MIT
└── README.md
```

## Run locally
```bash
git clone https://github.com/zawarudo-coder/webmcp-hackathon.git
cd webmcp-hackathon
python3 -m http.server 8000
```

Open `http://localhost:8000` in **ChatGPT desktop browser** (WebMCP enabled by default) or **Google Chrome 149+** with `chrome://flags/#enable-webmcp-testing`.

## Demo flow (3-min video)
1. Human places note: "What is XSS?" → agent sees it via `list_notes`
2. Agent calls `generate_question("Cross-Site Scripting (XSS)", "hard")` → question appears on canvas
3. Human submits answer via `check_answer` → agent evaluates
4. Agent calls `explain_mistake` → explains the vulnerability in plain language
5. Agent calls `get_weak_areas` → identifies weak concepts
6. Agent calls `snapshot` → exports full learning trace for judging
7. Both iterate live on the shared canvas

## License
MIT — see [LICENSE](LICENSE).
