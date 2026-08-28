# CollabCanvas — WebMCP Human + Agent Co-Creation

## What is it?
CollabCanvas is a **WebMCP-powered web app** that reimagines the open web as a shared creative space where **humans and AI agents collaborate in real time**. Built for the OpenAI WebMCP Challenge hackathon.

## Why WebMCP
WebMCP lets the browser itself become a **tool-use host**: an AI agent running in ChatGPT/Chrome can reach into the live page, read state, draw, fetch context, and act as a true collaborative partner — not a distant API call. CollabCanvas registers WebMCP tools on the page so an agent can see the canvas, contribute content, and respond to human actions, creating a genuine loop of human↔agent creativity.

## What people and agents can do together
1. A human opens the page and places sticky notes on the shared canvas.
2. An AI agent (via WebMCP) reads the canvas state via `list_notes` or `resource://collabcanvas/state`, adds complementary notes with `add_note`, and tracks contributors through the **identity graph**.
3. Both iterate live — the agent sees human changes instantly (BroadcastChannel sync) and humans see agent contributions in real time.
4. Agents can use `get_identity` to read creator styles, `move_note` to reposition, and `snapshot` to export the full canvas with a reasoning trace for judging.

## WebMCP tools registered
| Tool | Description |
|---|---|
| `add_note` | Add a text note to the shared canvas with creator tracking |
| `list_notes` | List all notes with identity metadata |
| `move_note` | Move a note to a new position |
| `add_agent` | Register a new AI agent persona on-canvas |
| `get_identity` | Read a contributor's identity & style |
| `clear_canvas` | Reset the canvas |
| `snapshot` | Export state + reasoning trace |
| `list_tools` | Discover all available tools |

## WebMCP resources
| URI | Description |
|---|---|
| `resource://collabcanvas/state` | Full canvas state: notes, agents, identities |
| `resource://collabcanvas/identities/{creatorId}` | Contributor identity + contribution history |

## Architecture
```
webmcp-hackathon/
├── public/
│   ├── index.html        # Page shell
│   ├── app.js            # WebMCP tool/resource registration + canvas logic
│   ├── style.css         # Shared canvas UI
│   ├── sw.js             # Service Worker (offline-first + sync)
│   └── manifest.json     # PWA manifest
├── manifest.json         # Root PWA manifest
├── LICENSE               # MIT
└── README.md
```

## How to run locally
```bash
git clone https://github.com/zawarudo-coder/webmcp-hackathon.git
cd webmcp-hackathon
python3 -m http.server 8000
# or: npx serve, or: go run github.com/...
```

Open `http://localhost:8000` in the ChatGPT desktop browser (WebMCP enabled) or Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

## Innovations
- **Identity Graph**: every note carries a creator identity with style + history, exposed as WebMCP resources
- **Live Tool Discovery**: agents call `list_tools` to discover available tools dynamically
- **Reasoning Trace**: `snapshot` exports full state + decision trace for judging transparency
- **Offline-First PWA**: Service Worker caches all assets; canvas works offline, syncs on reconnect
- **Real-Time Sync**: BroadcastChannel + StorageEvent keeps all tabs + connected agents in sync in <50ms

## Demo flow (for 3-min video)
1. Human clicks canvas → note appears ("Future of browser AI")
2. Agent calls `list_notes` → sees the note
3. Agent calls `add_note` → adds a complementary insight
4. Agent calls `get_identity` → reads human's style metadata
5. Agent calls `snapshot` → exports state + reasoning trace
6. Both iterate live on the shared canvas

## License
MIT — see [LICENSE](LICENSE).
