# FinCanvas — 3-Minute Demo Script

## Goal
Show a human and AI agent co-analyzing Apple (AAPL) financials on the shared canvas, highlighting the unique WebMCP collaboration.

## Recording setup
- Screen record from **ChatGPT desktop browser** or **Chrome 149 with WebMCP enabled**
- Audio: explain each step as you do it
- Total target: **2m45s** (under 3-min limit)

---

### 0:00–0:15 — Hook / Intro
**On screen:** FinCanvas live site loads
**What to say:**  
> "Meet FinCanvas — a WebMCP-powered collaborative canvas where humans and AI agents co-analyze company financials in real time. I'm going to show you how a human analyst and an AI agent work together on Apple's financials in under three minutes."

### 0:15–0:30 — Setup
**On screen:** Canvas loads with AAPL company card pre-loaded
**What to say:**  
> "The canvas already has Apple loaded. I can see the company card, the tool list on the sidebar, and the console. An AI agent is already connected via WebMCP — it can see these tools and call them directly on this page."
>
> *[Click on canvas]* "I'll add a note: 'Looking at AAPL margins 2022-2024.'"

### 0:30–0:50 — Agent discovers & fetches data
**On screen:** Agent calls `list_tools`, then `fetch_financials`
**What to say:**  
> "Let me have the agent discover what tools are available. It calls `list_tools` — boom, it sees all 10 tools. Then the agent calls `fetch_financials` on AAPL to pull the actual financial data."
>
> *[Show data loading onto the canvas — revenue plot appears]*

### 0:50–1:20 — Human + Agent co-create notes
**On screen:** Agent calls `add_note` (margin analysis), human adds a follow-up note
**What to say:**  
> "Now the agent spots something. It calls `add_note` — 'Margin peaked in 2022, declining trend since.' You can see the note appear on the canvas, right next to the chart. I can click to add my own note — 'But services revenue is growing, offsetting hardware margins.'"
>
> *[Both notes visible simultaneously — human green, agent blue]*

### 1:20–1:50 — Ratio analysis + anomaly detection
**On screen:** Agent calls `calculate_ratio`, `highlight_anomaly`
**What to say:**  
> "Let's dig deeper. The agent calls `calculate_ratio` — P/E, ROE, Debt/Equity. *[show ratios populating sidebar]*
>
> "Then it flags an anomaly — `highlight_anomaly`: 'Total debt jumped from $111B to $206B between 2022 and 2024.' *[anomaly flashes orange on right side]*"
>
> "Now I know exactly where to focus — debt trajectory, not just margins."

### 1:50–2:20 — Hypothesis generation + identity graph
**On screen:** Agent calls `generate_hypothesis`, `get_identity`
**What to say:**  
> "With that anomaly flagged, the agent calls `generate_hypothesis` — it proposes: 'AAPL's rising debt is funding share buybacks, diluting long-term optionality. Monitor interest coverage ratio.' *[note appears at x:800]*
>
> "And because every note has a creator identity, the agent can call `get_identity` to understand my analysis style — casual, data-focused. Next time it adapts its tone to match."

### 2:20–2:45 — Snapshot + wrap
**On screen:** Agent calls `snapshot`, shows exported JSON
**What to say:**  
> "Finally, the agent calls `snapshot` — this exports the entire canvas state, all notes, ratios, anomalies, and the full reasoning trace as JSON. *[show the trace output]*
>
> "This is the future of the open web: a human analyst and an AI agent co-piloting a financial analysis, each seeing the other's contributions instantly. WebMCP makes the browser itself collaborative — no more chatbots in a separate window. Everything happens on the same canvas, in the same context."
>
> "Five tools, three resources, one shared workspace. FinCanvas — where analysts and agents think together."

---

### Call-to-action (optional text overlay at end)
> **GitHub:** github.com/zawarudo-coder/webmcp-hackathon  
> **Live:** zawarudo-coder.github.io/webmcp-hackathon  
> **WebMCP Challenge**
