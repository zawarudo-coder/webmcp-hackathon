# FinCanvas

WebMCP-powered collaborative canvas for human + AI co-analysis of public-company financials. Place notes, plot data points, flag anomalies, build an investment memo together on a persistent shared workspace — exactly the kind of human↔agent collaboration WebMCP enables.

## Quick start

```bash
# clone
git clone https://github.com/zawarudo-coder/webmcp-hackathon.git
cd webmcp-hackathon

# serve locally (Python, Node, or any static server)
python3 -m http.server 8000
open http://localhost:8000

# optional: auto-open DevTools with WebMCP console
npx serve -s . -l 8000 && open http://localhost:8000
```

## How to test with WebMCP

FinCanvas exposes WebMCP tools directly on the page via `document.modelContext`. An agent running in ChatGPT's in-app browser or Chrome 149+ (with `chrome://flags/#enable-webmcp-testing`) can call:

| Tool | Description |
|---|---|
| `create_company_profile` | Add a company card to the canvas (ticker + name) |
| `fetch_financials` | Pull financials from our mock SEC/AlphaVantage data |
| `add_note` | Human or agent drops a sticky note (insight / question / thesis) |
| `add_data_point` | Plot a value at an (x,y) coordinate on the mini-chart |
| `calculate_ratio` | Compute P/E, Debt/Equity, ROE, Gross Margin, etc. |
| `highlight_anomaly` | Flag a suspicious line item for review |
| `generate_hypothesis` | Agent proposes an investment thesis |
| `list_companies` | List all companies loaded on the canvas |
| `snapshot` | Export the complete memo + reasoning trace |
| `list_tools` | Discover all available tools at runtime |

WebMCP resources exposed:

| URI template | Description |
|---|---|
| `resource://fincanvas/state` | Full canvas state |
| `resource://fincanvas/company/{ticker}` | Single company's financials + notes |
| `resource://fincanvas/ratios` | All computed ratios |

## Project layout

```
fincanvas/
├── index.html       # Canvas UI (SVG + sidebar)
├── app.js           # WebMCP tool/resource registration + state machine
├── style.css        # Cyber-green terminal UI
├── sw.js            # Offline-first service worker
├── manifest.json    # PWA manifest
├── LICENSE
└── README.md
```

## Features

- **Shared canvas** — notes, data plots, and company cards persist live via BroadcastChannel
- **Identity graph** — each note tracks its creator (human vs agent) and role
- **Financial toolkit** — ratio calculations, anomaly detection, hypothesis engine
- **Live tool discovery** — agents can `list_tools` to see what's available
- **Reasoning trace** — `snapshot` exports the full decision chain
- **Dark-mode cyber-terminal aesthetic** — green-on-dark for analyst focus
- **Offline-capable PWA** — caches assets + state, works without network
- **Open source (MIT)** — fork, extend, and build on

## License

MIT — see [LICENSE](./LICENSE).
