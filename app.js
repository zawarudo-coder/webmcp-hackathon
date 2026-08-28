/* Security Lab Canvas — WebMCP-powered cybersecurity learning canvas (WebMCP hackathon) */
const collabState = {
  version: 3,
  notes: [],          // {id,text,x,y,owner,creator,concept}
  agents: [],         // {name,description}
  identities: {},     // creatorId -> {name,style,history}
  concepts: [],       // {id,title,vulnType,severity}  (OWASP Top 10 seed)
  questions: [],      // {id,noteId,question,answer,askedAt,answeredAt,correct}
  progress: {},       // creatorId -> {correct:number,total:number,weakAreas:[string]}
  nextId: 1,
  nextCreator: 1,
  nextConcept: 1,
  nextQ: 1,
};

/* ---- OWASP Top 10 seed concepts ---- */
const OWASP_CONCEPTS = [
  { title: "Broken Access Control", vulnType: "access-control", severity: "critical" },
  { title: "Cryptographic Failures", vulnType: "crypto", severity: "high" },
  { title: "Injection Attacks", vulnType: "injection", severity: "critical" },
  { title: "Insecure Design", vulnType: "design", severity: "high" },
  { title: "Security Misconfiguration", vulnType: "config", severity: "high" },
  { title: "Vulnerable Components", vulnType: "deps", severity: "high" },
  { title: "Authentication Failures", vulnType: "auth", severity: "high" },
  { title: "Cross-Site Scripting (XSS)", vulnType: "xss", severity: "high" },
  { title: "Server-Side Request Forgery", vulnType: "ssrf", severity: "high" },
  { title: "Security Logging Failures", vulnType: "logging", severity: "medium" },
];

/* ---- Persistence + cross-tab / cross-context sync ---- */
function loadState() {
  const raw = localStorage.getItem("securitylab-state");
  if (raw) Object.assign(collabState, JSON.parse(raw));
}

function saveState() {
  localStorage.setItem("securitylab-state", JSON.stringify(collabState));
  const bc = new (window.BroadcastChannel || function(){return{postMessage(){}}})("securitylab");
  bc.postMessage({ type: "state-update", state: JSON.stringify(collabState) });
  window.dispatchEvent(new StorageEvent("storage", { key: "securitylab-state", newValue: JSON.stringify(collabState) }));
}

window.addEventListener("storage", (e) => {
  if (e.key === "securitylab-state" && e.newValue) {
    Object.assign(collabState, JSON.parse(e.newValue));
    render();
  }
});

if ("BroadcastChannel" in window) {
  const bc = new BroadcastChannel("securitylab");
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

  // seed concepts into agent cards if empty
  if (collabState.concepts.length === 0) {
    OWASP_CONCEPTS.forEach((c) => {
      collabState.concepts.push({ id: String(collabState.nextConcept++), ...c });
    });
    collabState.agents.push({ name: "SecBot", description: "Your AI cybersecurity tutor — WebMCP powered" });
    saveState();
  }

  collabState.notes.forEach((n) => {
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
    text.textContent = n.text;
    g.appendChild(text);
    if (n.concept) {
      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("x", n.x + 10);
      tag.setAttribute("y", n.y + 42);
      tag.textContent = "#" + n.concept;
      tag.setAttribute("font-size", "10");
      tag.setAttribute("fill", "#60a5fa");
      g.appendChild(tag);
    }
    if (n.creator) {
      const creator = document.createElementNS("http://www.w3.org/2000/svg", "text");
      creator.setAttribute("x", n.x + 10);
      creator.setAttribute("y", n.y + 58);
      creator.textContent = "@" + n.creator;
      creator.setAttribute("font-size", "10");
      creator.setAttribute("fill", "#6b7280");
      g.appendChild(creator);
    }
    svg.appendChild(g);
  });

  // concept cards on the right
  collabState.concepts.forEach((c, i) => {
    if (i < 10) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", 740);
      rect.setAttribute("y", 60 + i * 46);
      rect.setAttribute("width", "150");
      rect.setAttribute("height", "38");
      rect.setAttribute("rx", "6");
      rect.setAttribute("class", "concept-card");
      g.appendChild(rect);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", 750);
      text.setAttribute("y", 84 + i * 46);
      text.textContent = c.title;
      text.setAttribute("font-size", "10");
      g.appendChild(text);
      svg.appendChild(g);
    }
  });
}

function listToolsUI() {
  const ul = document.getElementById("tool-list");
  ul.innerHTML = "";
  const tools = [
    { name: "add_note", desc: "Add a security concept note to the canvas" },
    { name: "generate_question", desc: "Agent generates a quiz question on a concept" },
    { name: "check_answer", desc: "Human answers a question; agent evaluates" },
    { name: "explain_mistake", desc: "Agent explains why an answer was wrong" },
    { name: "get_progress", desc: "Read mastery stats per creator" },
    { name: "get_weak_areas", desc: "Find concepts the learner struggles with" },
    { name: "create_flashcard_set", desc: "Batch-generate study cards for a concept" },
    { name: "snapshot", desc: "Export canvas + reasoning trace" },
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
  collabState.progress[id] = { correct: 0, total: 0, weakAreas: [] };
  return id;
}

/* ---- WebMCP integration ---- */
if (window.document.modelContext && typeof window.document.modelContext.registerTool === "function") {
  const mc = window.document.modelContext;

  /* Tool 1 — add_note */
  mc.registerTool({
    name: "add_note",
    description: "Add a security concept note to the shared canvas. Creator is inferred from the agent context if not provided.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The note content (e.g. concept explanation)." },
        x: { type: "integer", description: "X position on canvas." },
        y: { type: "integer", description: "Y position on canvas." },
        owner: { type: "string", enum: ["human", "agent"], description: "Who is adding the note." },
        creator: { type: "string", description: "Optional creator name for identity tracking." },
        style: { type: "string", description: "Optional style hint." },
        concept: { type: "string", description: "Optional OWASP concept tag." }
      },
      required: ["text", "x", "y", "owner"]
    },
    execute: async (input) => {
      loadState();
      const creatorId = input.creator ? ensureIdentity(input.creator, input.style) : String(collabState.nextCreator++);
      const note = { id: String(collabState.nextId++), text: input.text, x: input.x, y: input.y, owner: input.owner, creator: creatorId, concept: input.concept || null };
      collabState.notes.push(note);
      if (input.creator && collabState.identities[creatorId]) collabState.identities[creatorId].history.push(note.id);
      saveState();
      log(`[tool:add_note] ${note.owner} (${note.creator}) added note #${note.id}: "${note.text}"`);
      return { success: true, noteId: note.id };
    }
  });

  /* Tool 2 — list_notes */
  mc.registerTool({
    name: "list_notes",
    description: "Return all notes on the canvas with identity metadata.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      return { notes: collabState.notes, count: collabState.notes.length };
    }
  });

  /* Tool 3 — generate_question */
  mc.registerTool({
    name: "generate_question",
    description: "Agent generates a quiz question about a security concept. Returns questionId for later answer check.",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", description: "The OWASP concept (e.g. 'Injection')." },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Difficulty level." },
        creator: { type: "string", description: "Creator name asking the question." }
      },
      required: ["concept", "difficulty"]
    },
    execute: async (input) => {
      loadState();
      const qid = String(collabState.nextQ++);
      const q = {
        id: qid,
        concept: input.concept,
        difficulty: input.difficulty,
        question: `What is the primary risk in ${input.concept}?`,
        answer: `The primary risk in ${input.concept} is exploitation that allows an attacker to compromise the system.`,
        askedAt: new Date().toISOString(),
        creator: input.creator || "agent"
      };
      collabState.questions.push(q);
      saveState();
      log(`[tool:generate_question] created Q#${qid} on "${input.concept}" (${input.difficulty})`);
      return { success: true, questionId: qid, question: q.question };
    }
  });

  /* Tool 4 — check_answer */
  mc.registerTool({
    name: "check_answer",
    description: "Human submits an answer to a generated question; agent evaluates correctness.",
    inputSchema: {
      type: "object",
      properties: {
        questionId: { type: "string" },
        answer: { type: "string" },
        creator: { type: "string", description: "Who is answering." }
      },
      required: ["questionId", "answer"]
    },
    execute: async (input) => {
      loadState();
      const q = collabState.questions.find((v) => v.id === input.questionId);
      if (!q) return { success: false, error: "question not found" };
      const answerLower = input.answer.toLowerCase();
      const answerKeyLower = q.answer.toLowerCase();
      // simple keyword overlap for correctness
      const keywords = answerLower.split(/\W+/).filter((w) => w.length > 3);
      const correct = keywords.some((k) => answerKeyLower.includes(k)) || answerLower.includes(q.concept.toLowerCase());
      q.answeredAt = new Date().toISOString();
      q.correct = correct;
      q.userAnswer = input.answer;
      const creatorId = input.creator ? ensureIdentity(input.creator) : String(collabState.nextCreator);
      if (!collabState.progress[creatorId]) collabState.progress[creatorId] = { correct: 0, total: 0, weakAreas: [] };
      collabState.progress[creatorId].total++;
      if (correct) collabState.progress[creatorId].correct++;
      else {
        if (!collabState.progress[creatorId].weakAreas.includes(q.concept)) {
          collabState.progress[creatorId].weakAreas.push(q.concept);
        }
      }
      if (collabState.identities[creatorId]) collabState.identities[creatorId].history.push(q.id);
      saveState();
      return { success: true, correct, expected: q.answer };
    }
  });

  /* Tool 5 — explain_mistake */
  mc.registerTool({
    name: "explain_mistake",
    description: "Agent explains why the user's answer was wrong.",
    inputSchema: {
      type: "object",
      properties: { questionId: { type: "string" } },
      required: ["questionId"]
    },
    execute: async (input) => {
      loadState();
      const q = collabState.questions.find((v) => v.id === input.questionId);
      if (!q || !q.userAnswer) return { success: false, error: "question not answered" };
      const explanation = `Your answer was: "${q.userAnswer}". The correct concept is: "${q.answer}". The key idea is that ${q.concept} involves risks that can be mitigated through proper validation, encoding, and access controls.`;
      log(`[tool:explain_mistake] Q#${input.questionId} explanation provided`);
      return { success: true, explanation, concept: q.concept };
    }
  });

  /* Tool 6 — get_progress */
  mc.registerTool({
    name: "get_progress",
    description: "Read mastery stats per creator.",
    inputSchema: {
      type: "object",
      properties: { creator: { type: "string" } },
      required: ["creator"]
    },
    execute: async (input) => {
      loadState();
      const creatorId = ensureIdentity(input.creator);
      return { success: true, progress: collabState.progress[creatorId] || { correct: 0, total: 0, weakAreas: [] } };
    }
  });

  /* Tool 7 — get_weak_areas */
  mc.registerTool({
    name: "get_weak_areas",
    description: "Find concepts the learner struggles with.",
    inputSchema: {
      type: "object",
      properties: { creator: { type: "string" } },
      required: ["creator"]
    },
    execute: async (input) => {
      loadState();
      const creatorId = ensureIdentity(input.creator);
      const prog = collabState.progress[creatorId];
      const weak = prog ? prog.weakAreas : [];
      const recommended = [];
      OWASP_CONCEPTS.forEach((c) => {
        if (weak.includes(c.title) || (!weak.includes(c.title) && Math.random() > 0.7)) {
          recommended.push(c.title);
        }
      });
      return { success: true, weakAreas: weak, recommendedConcepts: recommended };
    }
  });

  /* Tool 8 — create_flashcard_set */
  mc.registerTool({
    name: "create_flashcard_set",
    description: "Batch-generate flashcards for a security concept.",
    inputSchema: {
      type: "object",
      properties: { concept: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 10, default: 3 } },
      required: ["concept"]
    },
    execute: async (input) => {
      loadState();
      const count = input.count || 3;
      const cards = [];
      for (let i = 0; i < count; i++) {
        cards.push({
          front: `Q${i+1}: What is ${input.concept}?`,
          back: `${input.concept} is a critical vulnerability that requires secure coding practices to mitigate.`
        });
      }
      log(`[tool:create_flashcard_set] ${count} cards for "${input.concept}"`);
      return { success: true, flashcards: cards };
    }
  });

  /* Tool 9 — clear_canvas */
  mc.registerTool({
    name: "clear_canvas",
    description: "Reset the canvas and progress.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      collabState.notes = [];
      collabState.questions = [];
      collabState.progress = {};
      collabState.identities = {};
      collabState.concepts = [];
      collabState.nextId = 1;
      collabState.nextCreator = 1;
      collabState.nextConcept = 1;
      saveState();
      return { success: true };
    }
  });

  /* Tool 10 — snapshot */
  mc.registerTool({
    name: "snapshot",
    description: "Export full canvas state, concepts, questions, and progress trace.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      loadState();
      const snap = {
        timestamp: new Date().toISOString(),
        state: collabState,
        reasoningTrace: collabState.notes.map((n) => ({ noteId: n.id, text: n.text, owner: n.owner, creator: n.creator, concept: n.concept })),
        quizResults: collabState.questions.map((q) => ({ questionId: q.id, concept: q.concept, correct: q.correct, userAnswer: q.userAnswer, expected: q.answer })),
      };
      log("[tool:snapshot] exported " + collabState.notes.length + " notes + " + collabState.questions.length + " quiz results");
      return { success: true, snapshot: JSON.stringify(snap, null, 2) };
    }
  });

  /* Discoverable tool list */
  mc.registerTool({
    name: "list_tools",
    description: "Discover all tools registered on this WebMCP page.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      return {
        tools: [
          { name: "add_note", description: "Add a security concept note" },
          { name: "list_notes", description: "List all notes" },
          { name: "generate_question", description: "Generate a quiz question on a concept" },
          { name: "check_answer", description: "Submit answer to a question" },
          { name: "explain_mistake", description: "Explain why an answer was wrong" },
          { name: "get_progress", description: "Read mastery stats" },
          { name: "get_weak_areas", description: "Find concepts to review" },
          { name: "create_flashcard_set", description: "Generate study flashcards" },
          { name: "clear_canvas", description: "Reset canvas" },
          { name: "snapshot", description: "Export state + trace" },
        ]
      };
    }
  });

  /* Expose state as MCP resources */
  mc.registerResource({
    uriTemplate: "resource://securitylab/state",
    description: "Full canvas state: notes, concepts, questions, identities, progress.",
    read: async () => {
      loadState();
      return { contents: [{ uri: "resource://securitylab/state", text: JSON.stringify(collabState, null, 2), mimeType: "application/json" }] };
    }
  });

  mc.registerResource({
    uriTemplate: "resource://securitylab/concepts",
    description: "Available OWASP Top 10 learning concepts.",
    read: async () => {
      loadState();
      return { contents: [{ uri: "resource://securitylab/concepts", text: JSON.stringify(collabState.concepts, null, 2), mimeType: "application/json" }] };
    }
  });

  log("WebMCP tools registered: add_note, list_notes, generate_question, check_answer, explain_mistake, get_progress, get_weak_areas, create_flashcard_set, clear_canvas, snapshot, list_tools");
  log("WebMCP resources: resource://securitylab/state, resource://securitylab/concepts");
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
        text: "Security concept",
        x: Math.round(svgP.x),
        y: Math.round(svgP.y),
        owner: "human",
        creator: "human",
        concept: "General"
      }).then(() => { loadState(); render(); })
        .catch(() => {
          loadState();
          const id = ensureIdentity("human");
          collabState.notes.push({ id: String(collabState.nextId++), text: "Security concept", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id, concept: "General" });
          saveState(); render();
        });
    } else {
      loadState();
      const id = ensureIdentity("human");
      collabState.notes.push({ id: String(collabState.nextId++), text: "Security concept", x: Math.round(svgP.x), y: Math.round(svgP.y), owner: "human", creator: id, concept: "General" });
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
log("Security Lab Canvas ready. Click the canvas to place a note. An AI agent can join via WebMCP.");
