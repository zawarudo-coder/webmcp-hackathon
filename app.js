/* FinCanvas — WebMCP-powered collaborative financial analyst canvas */
const state = {
  version: 3,
  notes: [],          // {id,text,x,y,owner,creator,createdAt}
  companies: [],      // {ticker,name,sector,financials?:object,notes?:[]}
  ratios: [],         // {id,ticker,ratio,value,computedAt}
  anomalies: [],      // {id,ticker,lineItem,value}
  identities: {},     // id -> {name,role,history}
  paths: [],          // drawn agent reasoning paths (x0,y0 -> x1,y1)
  nextId: 1,
  nextCreator: 1,
  nextRatio: 1,
  nextAnomaly: 1,
};

/* ===== Mock financial data (public-company style) ===== */
const MOCK_FINANCIALS = {
  AAPL: {
    name: "Apple Inc.",
    sector: "Technology",
    data: {
      "2024": { revenue: 383.0, netIncome: 97.6, totalAssets: 336.0, totalDebt: 206.0, shareholdersEquity: 62.0, sharesOutstanding: 15.8 },
      "2023": { revenue: 383.3, netIncome: 97.0, totalAssets: 352.0, totalDebt: 178.0, shareholdersEquity: 62.7, sharesOutstanding: 16.4 },
      "2022": { revenue: 394.3, netIncome: 99.8, totalAssets: 346.0, totalDebt: 111.0, shareholdersEquity: 63.1, sharesOutstanding: 16.5 },
    },
    price: 218.0,
    marketCap: 3_400,
  },
  MSFT: {
    name: "Microsoft Corp.",
    sector: "Technology",
    data: {
      "2024": { revenue: 211.9, netIncome: 72.4, totalAssets: 412.0, totalDebt: 75.0, shareholdersEquity: 198.0, sharesOutstanding: 7.4 },
      "2023": { revenue: 211.9, netIncome: 72.0, totalAssets: 387.0, totalDebt: 56.0, shareholdersEquity: 193.0, sharesOutstanding: 7.4 },
      "2022": { revenue: 198.3, netIncome: 61.2, totalAssets: 365.0, totalDebt: 44.0, shareholdersEquity: 185.0, sharesOutstanding: 7.5 },
    },
    price: 420.0,
    marketCap: 3_100,
  },
  TSLA: {
    name: "Tesla Inc.",
    sector: "Automotive",
    data: {
      "2024": { revenue: 97.7, netIncome: 15.0, totalAssets: 152.0, totalDebt: 47.0, shareholdersEquity: 52.0, sharesOutstanding: 3.1 },
      "2023": { revenue: 96.8, netIncome: 15.0, totalAssets: 151.0, totalDebt: 45.0, shareholdersEquity: 50.0, sharesOutstanding: 3.1 },
      "2022": { revenue: 81.5, netIncome: 12.6, totalAssets: 139.0, totalDebt: 39.0, shareholdersEqualty: 43.0, sharesOutstanding: 3.2 },
    },
    price: 250.0,
    marketCap: 797,
  },
};

/* ===== Persistence + sync ===== */
function loadState() {
  const raw = localStorage.getItem("fincanvas-state");
  if (raw) Object.assign(state, JSON.parse(raw));
}

function saveState() {
  localStorage.setItem("fincanvas-state", JSON.stringify(state));
  const bc = new (window.BroadcastChannel || function () { return { postMessage() {} }; })("fincanvas");
  bc.postMessage({ type: "state-update", state: JSON.stringify(state) });
  window.dispatchEvent(new StorageEvent("storage", { key: "fincanvas-state", newValue: JSON.stringify(state) }));
}

window.addEventListener("storage", (e) => {
  if (e.key === "fincanvas-state" && e.newValue) {
    Object.assign(state, JSON.parse(e.newValue));
    render();
  }
});

if ("BroadcastChannel" in window) {
  const bc = new BroadcastChannel("fincanvas");
  bc.onmessage = (e) => {
    if (e.data && e.data.type === "state-update") {
      Object.assign(state, JSON.parse(e.data.state));
      render();
    }
  };
}

/* ===== Identity helpers ===== */
function ensureIdentity(name, role) {
  const existing = Object.entries(state.identities).find(([, v]) => v.name === name);
  if (existing) return existing[0];
  const id = String(state.nextCreator++);
  state.identities[id] = { name, role: role || "analyst", history: [] };
  return id;
}

/* ===== Logging ===== */
function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}

/* ===== Rendering ===== */
function render() {
  const svg = document.getElementById("canvas");
  svg.innerHTML = "";

  // Draw agent reasoning paths
  state.paths.forEach((p) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p.fromX);
    line.setAttribute("y1", p.fromY);
    line.setAttribute("x2", p.toX);
    line.setAttribute("y2", p.toY);
    line.setAttribute("class", "agent-path");
    svg.appendChild(line);
  });

  // Company cards
  state.companies.forEach((c, i) => {
    const x = 60;
    const y = 40 + i * 110;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", "200");
    rect.setAttribute("height", "90");
    rect.setAttribute("rx", "8");
    rect.setAttribute("class", "company-card");
    g.appendChild(rect);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.setAttribute("x", x + 12);
    title.setAttribute("y", y + 22);
    title.setAttribute("class", "ticker");
    title.textContent = c.ticker;
    g.appendChild(title);
    const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
    name.setAttribute("x", x + 12);
    name.setAttribute("y", y + 40);
    name.setAttribute("class", "company-label");
    name.textContent = c.name;
    g.appendChild(name);
    const sector = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sector.setAttribute("x", x + 12);
    sector.setAttribute("y", y + 56);
    sector.setAttribute("class", "note-label");
    sector.textContent = c.sector;
    g.appendChild(sector);
    svg.appendChild(g);
  });

  // Notes
  state.notes.forEach((n) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", n.x);
    rect.setAttribute("y", n.y);
    rect.setAttribute("width", "180");
    rect.setAttribute("height", "70");
    rect.setAttribute("rx", "8");
    rect.setAttribute("class", n.owner === "human" ? "note-h" : "note-a");
    g.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", n.x + 10);
    text.setAttribute("y", n.y + 22);
    text.textContent = n.text.length > 28 ? n.text.substring(0, 28) + "…" : n.text;
    g.appendChild(text);
    if (n.creator) {
      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("x", n.x + 10);
      tag.setAttribute("y", n.y + 42);
      tag.setAttribute("class", "note-label");
      tag.textContent = "@" + (state.identities[n.creator]?.name || n.creator);
      g.appendChild(tag);
    }
    svg.appendChild(g);
  });

  // Data points / mini-chart
  state.companies.forEach((c, ci) => {
    const cx = 60;
    const cy = 40 + ci * 110 + 90;
    const years = ["2022", "2023", "2024"];
    const vals = years.map((y) => c.financials?.data?.[y]?.revenue || 0);
    const maxV = Math.max(...vals, 1);
    years.forEach((yr, i) => {
      const px = cx + 40 + i * 40;
      const py = cy - 8 - ((vals[i] / maxV) * 24);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", px);
      dot.setAttribute("cy", py);
      dot.setAttribute("r", "4");
      dot.setAttribute("class", "chart-point");
      svg.appendChild(dot);
    });
  });

  // Anomalies
  state.anomalies.forEach((a, i) => {
    const y = 120 + i * 24;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 760);
    rect.setAttribute("y", y);
    rect.setAttribute("width", "220");
    rect.setAttribute("height", "20");
    rect.setAttribute("rx", "4");
    rect.setAttribute("class", "anomaly-flag");
    g.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 770);
    text.setAttribute("y", y + 14);
    text.setAttribute("fill", "#fbbf24");
    text.textContent = a.ticker + " " + a.lineItem + ": " + a.value;
    g.appendChild(text);
    svg.appendChild(g);
  });

  renderCompanyList();
  renderRatioList();
  listToolsUI();
}

function renderCompanyList() {
  const ul = document.getElementById("company-list");
  ul.innerHTML = "";
  state.companies.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.ticker}</strong> — ${c.name} <span class="del" onclick="removeCompany(${i})">✕</span>`;
    ul.appendChild(li);
  });
}

function removeCompany(idx) {
  state.companies.splice(idx, 1);
  saveState(); render();
}

function renderRatioList() {
  const ul = document.getElementById("ratio-list");
  ul.innerHTML = "";
  state.ratios.forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="ratio-name">${r.ticker} ${r.ratio}</span> <span class="ratio-val">${r.value.toFixed(2)}</span>`;
    ul.appendChild(li);
  });
}

function listToolsUI() {
  const ul = document.getElementById("tool-list");
  ul.innerHTML = "";
  const tools = [
    { name: "create_company_profile", desc: "Add a company to the canvas" },
    { name: "fetch_financials", desc: "Pull financial data for a ticker" },
    { name: "add_note", desc: "Place an insight/analysis note" },
    { name: "add_data_point", desc: "Plot a financial metric" },
    { name: "calculate_ratio", desc: "Compute P/E, ROE, Debt/Equity, etc." },
    { name: "highlight_anomaly", desc: "Flag a suspicious line item" },
    { name: "generate_hypothesis", desc: "Agent proposes an investment thesis" },
    { name: "list_companies", desc: "List all companies on canvas" },
    { name: "snapshot", desc: "Export memo + reasoning trace" },
    { name: "list_tools", desc: "Discover all available tools" },
  ];
  tools.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${t.name}</strong>: ${t.desc}`;
    ul.appendChild(li);
  });
}

/* ===== WebMCP Integration ===== */
if (window.document.modelContext && typeof window.document.modelContext.registerTool === "function") {
  const mc = window.document.modelContext;

  /* Tool 1 — create_company_profile */
  mc.registerTool({
    name: "create_company_profile",
    description: "Add a company card to the canvas (ticker + name + sector).",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker (e.g. AAPL)." },
        name: { type: "string", description: "Full company name." },
        sector: { type: "string", description: "Industry sector." }
      },
      required: ["ticker", "name", "sector"]
    },
    execute: async (input) => {
      loadState();
      state.companies.push({ ticker: input.ticker, name: input.name, sector: input.sector, financials: MOCK_FINANCIALS[input.ticker], notes: [] });
      saveState();
      log(`[tool:create_company_profile] added ${input.ticker} — ${input.name} (${input.sector})`);
      return { success: true, ticker: input.ticker };
    }
  });

  /* Tool 2 — fetch_financials */
  mc.registerTool({
    name: "fetch_financials",
    description: "Pull financial data for a ticker from our mock SEC/AlphaVantage dataset.",
    inputSchema: {
      type: "object",
      properties: { ticker: { type: "string" } },
      required: ["ticker"]
    },
    execute: async (input) => {
      loadState();
      const c = state.companies.find((c) => c.ticker === input.ticker);
      if (!c) return { success: false, error: "company not on canvas" };
      const data = MOCK_FINANCIALS[input.ticker];
      if (!data) return { success: false, error: "no mock financials for " + input.ticker };
      c.financials = data;
      saveState();
      log(`[tool:fetch_financials] loaded ${input.ticker} financials: ` + Object.keys(data.data).join(", "));
      return { success: true, ticker: input.ticker, financials: data };
    }
  });

  /* Tool 3 — add_note */
  mc.registerTool({
    name: "add_note",
    description: "Place a sticky note on the canvas. Creator is tracked (human vs agent).",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        x: { type: "integer" },
        y: { type: "integer" },
        owner: { type: "string", enum: ["human", "agent"] },
        creator: { type: "string", description: "Creator name for identity tracking." },
        role: { type: "string", enum: ["analyst", "tutor", "user"], description: "Role of creator." }
      },
      required: ["text", "x", "y", "owner"]
    },
    execute: async (input) => {
      loadState();
      const creatorId = input.creator ? ensureIdentity(input.creator, input.role) : ensureIdentity(input.owner === "human" ? "human" : "ai-agent", "analyst");
      const note = { id: String(state.nextId++), text: input.text, x: input.x, y: input.y, owner: input.owner, creator: creatorId, createdAt: new Date().toISOString() };
      state.notes.push(note);
      saveState();
      log(`[tool:add_note] ${note.owner}@${state.identities[creatorId]?.name || creatorId}: "${note.text}" @(${note.x},${note.y})`);
      return { success: true, noteId: note.id };
    }
  });

  /* Tool 4 — add_data_point */
  mc.registerTool({
    name: "add_data_point",
    description: "Add a plotted data point to the canvas mini-chart for a company.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        year: { type: "string" },
        metric: { type: "string", enum: ["revenue", "netIncome", "totalAssets", "totalDebt"] },
        value: { type: "number" }
      },
      required: ["ticker", "year", "metric", "value"]
    },
    execute: async (input) => {
      loadState();
      const c = state.companies.find((c) => c.ticker === input.ticker);
      if (!c || !c.financials) return { success: false, error: "company or financials not found" };
      if (!c.financials.data[input.year]) c.financials.data[input.year] = {};
      c.financials.data[input.year][input.metric] = input.value;
      saveState();
      log(`[tool:add_data_point] ${input.ticker} ${input.year} ${input.metric} = ${input.value}`);
      return { success: true };
    }
  });

  /* Tool 5 — calculate_ratio */
  mc.registerTool({
    name: "calculate_ratio",
    description: "Compute a financial ratio for a company (P/E, ROE, Debt/Equity, Gross Margin, Net Margin).",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        ratio: { type: "string", enum: ["P/E", "ROE", "Debt/Equity", "Gross Margin", "Net Margin", "Current Ratio"] },
        year: { type: "string" }
      },
      required: ["ticker", "ratio", "year"]
    },
    execute: async (input) => {
      loadState();
      const c = state.companies.find((c) => c.ticker === input.ticker);
      if (!c || !c.financials?.data?.[input.year]) return { success: false, error: "data not found" };
      const d = c.financials.data[input.year];
      let val = 0;
      switch (input.ratio) {
        case "P/E":
          val = c.financials.price ? (c.financials.marketCap / d.netIncome) : 0;
          break;
        case "ROE":
          val = (d.netIncome / d.shareholdersEquity) * 100;
          break;
        case "Debt/Equity":
          val = d.totalDebt / d.shareholdersEquity;
          break;
        case "Gross Margin":
          val = (d.grossProfit || d.netIncome) / d.revenue * 100;
          break;
        case "Net Margin":
          val = (d.netIncome / d.revenue) * 100;
          break;
        case "Current Ratio":
          val = d.totalAssets / d.totalDebt; // simplified
          break;
      }
      state.ratios.push({ id: String(state.nextRatio++), ticker: input.ticker, ratio: input.ratio, value: val, year: input.year, computedAt: new Date().toISOString() });
      saveState();
      log(`[tool:calculate_ratio] ${input.ticker} ${input.ratio} (${input.year}) = ${val.toFixed(2)}`);
      return { success: true, ticker: input.ticker, ratio: input.ratio, value: val };
    }
  });

  /* Tool 6 — highlight_anomaly */
  mc.registerTool({
    name: "highlight_anomaly",
    description: "Flag a suspicious or unusual financial line item for later review.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        lineItem: { type: "string" },
        value: { type: "string" },
        reason: { type: "string" }
      },
      required: ["ticker", "lineItem", "value"]
    },
    execute: async (input) => {
      loadState();
      const anomaly = { id: String(state.nextAnomaly++), ticker: input.ticker, lineItem: input.lineItem, value: input.value, reason: input.reason || "", flaggedAt: new Date().toISOString() };
      state.anomalies.push(anomaly);
      saveState();
      log(`[tool:highlight_anomaly] ${input.ticker} ${input.lineItem} = ${input.value} — ${input.reason || "flagged"}`);
      return { success: true, anomalyId: anomaly.id };
    }
  });

  /* Tool 7 — generate_hypothesis */
  mc.registerTool({
    name: "generate_hypothesis",
    description: "Agent generates an investment hypothesis based on the canvas state.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        creator: { type: "string" },
        focus: { type: "string", enum: ["growth", "value", "turnaround", "quality"] }
      },
      required: ["ticker"]
    },
    execute: async (input) => {
      loadState();
      const focus = input.focus || "growth";
      const hypotheses = {
        growth: `${input.ticker} shows accelerating revenue and expanding gross margins, indicating a company in a strong growth phase. Recommend accumulate position ahead of the next earnings cycle.`,
        value: `${input.ticker} is trading at a discount relative to its sector P/E and holds strong cash flow generation. Potential value opportunity if trends hold.`,
        turnaround: `${input.ticker} exhibits declining net income but stable revenue — a potential turnaround play if cost measures take effect. Monitor next quarter closely.`,
        quality: `${input.ticker} maintains consistent ROE and manageable debt-to-equity, reflecting operational quality and financial discipline.`,
      };
      const noteId = String(state.nextId++);
      const creatorId = input.creator ? ensureIdentity(input.creator, "analyst") : ensureIdentity("ai-agent", "analyst");
      const note = { id: noteId, text: hypotheses[focus], x: 800, y: 100 + Math.random() * 200, owner: "agent", creator: creatorId, createdAt: new Date().toISOString() };
      state.notes.push(note);
      saveState();
      log(`[tool:generate_hypothesis] ${input.ticker} → ${focus} thesis created`);
      return { success: true, noteId, hypothesis: hypotheses[focus] };
    }
  });

  /* Tool 8 — list_companies */
  mc.registerTool({
    name: "list_companies",
    description: "List all companies currently loaded on the canvas.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      return { companies: state.companies.map((c) => ({ ticker: c.ticker, name: c.name, sector: c.sector })) };
    }
  });

  /* Tool 9 — snapshot */
  mc.registerTool({
    name: "snapshot",
    description: "Export the complete canvas state plus a reasoning trace for judging transparency.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      const snap = {
        timestamp: new Date().toISOString(),
        companies: state.companies,
        notes: state.notes,
        ratios: state.ratios,
        anomalies: state.anomalies,
        identities: state.identities,
        reasoningTrace: state.notes.map((n) => ({
          noteId: n.id,
          text: n.text,
          owner: n.owner,
          creator: n.creator,
          createdAt: n.createdAt,
        })),
      };
      log(`[tool:snapshot] exported ${state.notes.length} notes, ${state.ratios.length} ratios, ${state.anomalies.length} anomalies`);
      return { success: true, snapshot: JSON.stringify(snap, null, 2) };
    }
  });

  /* Tool 10 — list_tools */
  mc.registerTool({
    name: "list_tools",
    description: "Discover all tools currently registered on this WebMCP page.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({
      tools: [
        { name: "create_company_profile", description: "Add a company to the canvas" },
        { name: "fetch_financials", description: "Pull financial data for a ticker" },
        { name: "add_note", description: "Place an insight/analysis note" },
        { name: "add_data_point", description: "Plot a financial metric" },
        { name: "calculate_ratio", description: "Compute P/E, ROE, Debt/Equity, etc." },
        { name: "highlight_anomaly", description: "Flag a suspicious line item" },
        { name: "generate_hypothesis", description: "Agent proposes an investment thesis" },
        { name: "list_companies", description: "List all companies on canvas" },
        { name: "snapshot", description: "Export memo + reasoning trace" },
        { name: "list_tools", description: "Discover all available tools" },
      ]
    })
  });

  /* ===== WebMCP Resources ===== */
  mc.registerResource({
    uriTemplate: "resource://fincanvas/state",
    description: "Full canvas state: companies, notes, ratios, anomalies, identities.",
    read: async () => {
      loadState();
      return { contents: [{ uri: "resource://fincanvas/state", text: JSON.stringify(state, null, 2), mimeType: "application/json" }] };
    }
  });

  mc.registerResource({
    uriTemplate: "resource://fincanvas/company/{ticker}",
    description: "Single company's financials + notes + ratios.",
    read: async (params) => {
      loadState();
      const c = state.companies.find((c) => c.ticker === params.ticker);
      if (!c) return { contents: [] };
      return { contents: [{ uri: `resource://fincanvas/company/${params.ticker}`, text: JSON.stringify(c, null, 2), mimeType: "application/json" }] };
    }
  });

  mc.registerResource({
    uriTemplate: "resource://fincanvas/ratios",
    description: "All computed financial ratios.",
    read: async () => {
      loadState();
      return { contents: [{ uri: "resource://fincanvas/ratios", text: JSON.stringify(state.ratios, null, 2), mimeType: "application/json" }] };
    }
  });

  log("WebMCP tools registered: create_company_profile, fetch_financials, add_note, add_data_point, calculate_ratio, highlight_anomaly, generate_hypothesis, list_companies, snapshot, list_tools");
  log("WebMCP resources: resource://fincanvas/state, /company/{ticker}, /ratios");
} else {
  log("WebMCP modelContext not detected — running in standard browser mode (canvas still works).");
}

/* ===== Human controls ===== */
function initHumanControls() {
  // Seed with a default company so first-time visitors see something
  loadState();
  if (state.companies.length === 0) {
    ensureIdentity("human", "user");
    state.companies.push({ ticker: "AAPL", name: "Apple Inc.", sector: "Technology", financials: MOCK_FINANCIALS.AAPL, notes: [] });
    saveState();
  }

  document.getElementById("canvas").addEventListener("click", (e) => {
    const pt = document.getElementById("canvas").createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = document.getElementById("canvas").getScreenCTM();
    const svgP = pt.matrixTransform(ctm.inverse());

    if (window.document.modelContext) {
      window.document.modelContext.callTool("add_note", {
        text: "❓ Question",
        x: Math.round(svgP.x), y: Math.round(svgP.y),
        owner: "human", creator: "human", role: "user"
      }).then(() => { loadState(); render(); })
        .catch(() => {
          loadState();
          const id = ensureIdentity("human", "user");
          state.notes.push({ id: String(state.nextId++), text: "❓ Question", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id, createdAt: new Date().toISOString() });
          saveState(); render();
        });
    } else {
      loadState();
      const id = ensureIdentity("human", "user");
      state.notes.push({ id: String(state.nextId++), text: "❓ Question", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id, createdAt: new Date().toISOString() });
      saveState(); render();
    }
  });
}

/* ===== Boot ===== */
loadState();
render();
listToolsUI();
initHumanControls();
log("FinCanvas ready. Click the canvas to place a note. An AI agent can join via WebMCP.");
