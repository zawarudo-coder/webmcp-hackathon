/* CollabCanvas — shared canvas for humans & AI agents (WebMCP hackathon) */
const collabState = {
  version: 2,
  notes: [],          // {id,text,x,y,owner,creator}
  draws: [],          // {id,path,owner}
  agents: [],         // {name,description}
  identities: {},     // creatorId -> {name,style,history}
  nextId: 1,
  nextCreator: 1,
};

/* ---- Persistence + cross-tab / cross-context sync ---- */
function loadState() {
  const raw = localStorage.getItem("collabcanvas-state");
  if (raw) Object.assign(collabState, JSON.parse(raw));
}

function saveState() {
  localStorage.setItem("collabcanvas-state", JSON.stringify(collabState));
  // broadcast so other tabs / the connected agent context see updates
  const bc = new (window.BroadcastChannel || function(){return{postMessage(){}}})("collabcanvas");
  bc.postMessage({ type: "state-update", state: JSON.stringify(collabState) });
  window.dispatchEvent(new StorageEvent("storage", { key: "collabcanvas-state", newValue: JSON.stringify(collabState) }));
}

window.addEventListener("storage", (e) => {
  if (e.key === "collabcanvas-state" && e.newValue) {
    Object.assign(collabState, JSON.parse(e.newValue));
    render();
  }
});

if ("BroadcastChannel" in window) {
  const bc = new BroadcastChannel("collabcanvas");
  bc.onmessage = (e) => {
    if (e.data && e.data.type === "state-update") {
      Object.assign(collabState, JSON.parse(e.data.state));
      render();
    }
  };
}

/* ---- Rendering ---- */
function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}

function render() {
  const svg = document.getElementById("canvas");
  svg.innerHTML = "";

  collabState.notes.forEach((n) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", n.x);
    rect.setAttribute("y", n.y);
    rect.setAttribute("width", "160");
    rect.setAttribute("height", "60");
    rect.setAttribute("rx", "8");
    rect.setAttribute("class", n.owner === "human" ? "note-h" : "note-a");
    g.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", n.x + 10);
    text.setAttribute("y", n.y + 22);
    text.textContent = n.text;
    g.appendChild(text);
    // creator tag
    if (n.creator) {
      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("x", n.x + 10);
      tag.setAttribute("y", n.y + 42);
      tag.textContent = "@" + n.creator;
      tag.setAttribute("font-size", "10");
      tag.setAttribute("fill", "#6b7280");
      g.appendChild(tag);
    }
    svg.appendChild(g);
  });

  // agent cards
  collabState.agents.forEach((a, i) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 720);
    rect.setAttribute("y", 60 + i * 50);
    rect.setAttribute("width", "170");
    rect.setAttribute("height", "42");
    rect.setAttribute("rx", "6");
    rect.setAttribute("class", "agent-card");
    g.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 730);
    text.setAttribute("y", 88 + i * 50);
    text.textContent = a.name;
    g.appendChild(text);
    svg.appendChild(g);
  });
}

function listToolsUI() {
  const ul = document.getElementById("tool-list");
  ul.innerHTML = "";
  const tools = [
    { name: "add_note", desc: "Add a text note to the shared canvas" },
    { name: "move_note", desc: "Move a note to a new position" },
    { name: "list_notes", desc: "List all notes currently on the canvas" },
    { name: "add_agent", desc: "Register a new AI agent persona" },
    { name: "get_identity", desc: "Read a contributor's identity & style" },
    { name: "clear_canvas", desc: "Reset the entire shared canvas" },
    { name: "snapshot", desc: "Export canvas state + reasoning trace" },
  ];
  tools.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.name}: ${t.desc}`;
    ul.appendChild(li);
  });
}

/* ---- Identity graph helpers ---- */
function ensureIdentity(name, style) {
  const existing = Object.entries(collabState.identities).find(([k, v]) => v.name === name);
  if (existing) return existing[0];
  const id = String(collabState.nextCreator++);
  collabState.identities[id] = { name, style: style || "neutral", history: [] };
  return id;
}

/* ---- WebMCP integration ----
 * Register tools that an AI agent (via WebMCP) can call from ChatGPT/Chrome.
 * This is the required snippet shape from the hackathon rules.
 */
if (window.document.modelContext && typeof window.document.modelContext.registerTool === "function") {
  const mc = window.document.modelContext;

  /* Tool 1 — add_note */
  mc.registerTool({
    name: "add_note",
    description: "Add a text note to the shared canvas. Creator is inferred from the agent context if not provided.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The note content." },
        x: { type: "integer", description: "X position on canvas." },
        y: { type: "integer", description: "Y position on canvas." },
        owner: { type: "string", enum: ["human", "agent"], description: "Who is adding the note." },
        creator: { type: "string", description: "Optional creator name for identity tracking." },
        style: { type: "string", description: "Optional style hint for creator identity." }
      },
      required: ["text", "x", "y", "owner"]
    },
    execute: async (input) => {
      loadState();
      let creatorId = input.creator ? ensureIdentity(input.creator, input.style) : String(collabState.nextCreator++);
      const note = { id: String(collabState.nextId++), text: input.text, x: input.x, y: input.y, owner: input.owner, creator: creatorId };
      collabState.notes.push(note);
      if (input.creator && collabState.identities[creatorId]) collabState.identities[creatorId].history.push(note.id);
      saveState();
      log(`[tool:add_note] ${note.owner} (${note.creator}) added note #${note.id} at (${note.x},${note.y}): "${note.text}"`);
      return { success: true, noteId: note.id };
    }
  });

  /* Tool 2 — list_notes */
  mc.registerTool({
    name: "list_notes",
    description: "Return all notes currently on the shared canvas, with identity metadata.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      log("[tool:list_notes] returned " + collabState.notes.length + " notes");
      return { notes: collabState.notes };
    }
  });

  /* Tool 3 — move_note */
  mc.registerTool({
    name: "move_note",
    description: "Move an existing note to a new position.",
    inputSchema: {
      type: "object",
      properties: { noteId: { type: "string" }, x: { type: "integer" }, y: { type: "integer" } },
      required: ["noteId", "x", "y"]
    },
    execute: async (input) => {
      loadState();
      const n = collabState.notes.find((v) => v.id === input.noteId);
      if (!n) return { success: false, error: "note not found" };
      n.x = input.x; n.y = input.y;
      saveState();
      return { success: true };
    }
  });

  /* Tool 4 — add_agent */
  mc.registerTool({
    name: "add_agent",
    description: "Register a new AI agent persona so humans can see which agents are collaborating.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, description: { type: "string" } },
      required: ["name", "description"]
    },
    execute: async (input) => {
      loadState();
      collabState.agents.push({ name: input.name, description: input.description });
      saveState();
      return { success: true };
    }
  });

  /* Tool 5 — get_identity */
  mc.registerTool({
    name: "get_identity",
    description: "Read a contributor's identity and style metadata from the graph.",
    inputSchema: {
      type: "object",
      properties: { creatorId: { type: "string" } },
      required: ["creatorId"]
    },
    execute: async (input) => {
      loadState();
      const id = input.creatorId;
      const info = collabState.identities[id];
      if (!info) return { success: false, error: "identity not found" };
      return { success: true, identity: { id, name: info.name, style: info.style, noteCount: info.history.length } };
    }
  });

  /* Tool 6 — clear_canvas */
  mc.registerTool({
    name: "clear_canvas",
    description: "Reset the entire shared canvas.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      collabState.notes = [];
      collabState.draws = [];
      collabState.nextId = 1;
      saveState();
      log("[tool:clear_canvas] canvas reset");
      return { success: true };
    }
  });

  /* Tool 7 — snapshot */
  mc.registerTool({
    name: "snapshot",
    description: "Export the full canvas state plus a reasoning trace for judging transparency.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      const snap = {
        timestamp: new Date().toISOString(),
        state: collabState,
        reasoningTrace: collabState.notes.map((n) => ({
          noteId: n.id,
          text: n.text,
          owner: n.owner,
          creator: n.creator,
          position: { x: n.x, y: n.y },
        })),
      };
      log("[tool:snapshot] exported " + collabState.notes.length + " notes + trace");
      return { success: true, snapshot: JSON.stringify(snap, null, 2) };
    }
  });

  /* Discoverable tool list — agents can list_tools to see what's available */
  mc.registerTool({
    name: "list_tools",
    description: "Discover all tools currently registered on this WebMCP page.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      return {
        tools: [
          { name: "add_note", description: "Add a text note to the shared canvas" },
          { name: "list_notes", description: "List all notes on canvas" },
          { name: "move_note", description: "Move a note" },
          { name: "add_agent", description: "Register an AI agent persona" },
          { name: "get_identity", description: "Read creator identity & style" },
          { name: "clear_canvas", description: "Reset the canvas" },
          { name: "snapshot", description: "Export state + reasoning trace" },
        ],
      };
    }
  });

  /* Expose canvas state as an MCP resource so agents can read it directly */
  mc.registerResource({
    uriTemplate: "resource://collabcanvas/state",
    description: "The full shared canvas state (notes, draws, agents, identities).",
    read: async () => {
      loadState();
      return { contents: [{ uri: "resource://collabcanvas/state", text: JSON.stringify(collabState, null, 2), mimeType: "application/json" }] };
    }
  });

  /* Identity resource */
  mc.registerResource({
    uriTemplate: "resource://collabcanvas/identities/{creatorId}",
    description: "Read a contributor's identity and contribution history.",
    read: async (params) => {
      loadState();
      const id = params.creatorId;
      const info = collabState.identities[id];
      if (!info) return { contents: [] };
      return { contents: [{ uri: `resource://collabcanvas/identities/${id}`, text: JSON.stringify({ id, name: info.name, style: info.style, noteIds: info.history }, null, 2), mimeType: "application/json" }] };
    }
  });

  log("WebMCP tools registered: add_note, list_notes, move_note, add_agent, get_identity, clear_canvas, snapshot, list_tools");
  log("WebMCP resources: resource://collabcanvas/state, resource://collabcanvas/identities/{creatorId}");
} else {
  log("WebMCP modelContext not detected — running in standard browser mode (canvas still works).");
}

/* ---- Human controls ---- */
function initHumanControls() {
  document.getElementById("canvas").addEventListener("click", (e) => {
    const pt = document.getElementById("canvas").createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = document.getElementById("canvas").getScreenCTM();
    const svgP = pt.matrixTransform(ctm.inverse());

    if (window.document.modelContext) {
      window.document.modelContext.callTool("add_note", {
        text: "💡 idea",
        x: Math.round(svgP.x),
        y: Math.round(svgP.y),
        owner: "human",
        creator: "human",
        style: "casual"
      }).then(() => { loadState(); render(); })
        .catch(() => {
          // fallback: write locally
          loadState();
          const id = ensureIdentity("human", "casual");
          collabState.notes.push({ id: String(collabState.nextId++), text: "💡 idea", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id });
          saveState(); render();
        });
    } else {
      loadState();
      const id = ensureIdentity("human", "casual");
      collabState.notes.push({ id: String(collabState.nextId++), text: "💡 idea", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id });
      saveState(); render();
    }
  });
}

/* ---- Service Worker registration ---- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((e) => log("SW registration failed: " + e));
}

/* ---- Boot ---- */
loadState();
render();
listToolsUI();
initHumanControls();
log("CollabCanvas ready. Click the canvas to place a note. An AI agent can join via WebMCP.");
