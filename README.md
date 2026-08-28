# CollabCanvas — WebMCP Human + Agent Co-Creation

A WebMCP-powered web app that reimagines the open web as a shared creative space where **humans and AI agents collaborate in real time**. Users and agents co-author, co-design, and co-refine artifacts on a persistent canvas — something that was difficult or impossible in traditional single-user web apps.

## Why WebMCP

WebMCP lets the browser itself become a tool-use host: an agent running in ChatGPT/Chrome can reach into the live page, read state, draw, fetch context, and act as a true collaborative partner rather than a distant API call. CollabCanvas uses WebMCP tools registered on the page to let an AI agent see the canvas, contribute content, and respond to human actions — creating a genuine loop of human↔agent creativity.

## What people and agents can do together

- A human starts sketching notes on a shared canvas.
- An AI agent (via WebMCP) reads the canvas state, adds complementary ideas, fetches relevant background, and visually expands the canvas.
- Both iterate live: each sees the other's contributions immediately.
- Agents can register domain tools (search, fetch, compute) that the human invokes directly through WebMCP.

## How WebMCP is implemented

- The page calls `document.modelContext.registerTool(...)` for each tool (see `public/app.js`).
- Tools read/write a shared `collabState` object persisted to `localStorage` and broadcast via `StorageEvent`.
- `registerResource` exposes the canvas state as an MCP resource (`resource://collabcanvas/state`).
- The agent receives the tool list and resource URI via WebMCP, enabling discovery-free co-editing.

## Run locally

```bash
git clone https://github.com/zawarudo-coder/webmcp-hackathon.git
cd webmcp-hackathon
python3 -m http.server 8000
```

Open `http://localhost:8000` in the ChatGPT desktop browser (WebMCP enabled) or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

## Repository structure

```
webmcp-hackathon/
├── public/
│   ├── index.html
│   ├── app.js        # WebMCP tool/resource registration + canvas logic
│   └── style.css
├── LICENSE          # MIT
└── README.md
```

## License

MIT — see [LICENSE](LICENSE).
