/* FinCanvas — WebMCP analyst co-pilot (no build step). */
const state = {
  version: 4,
  notes: [],
  companies: [],
  ratios: [],
  anomalies: [],
  identities: {},
  paths: [],
  nextId: 1, nextCreator: 1, nextRatio: 1, nextAnomaly: 1,
};

const MOCK = {
  AAPL: { name: "Apple Inc.", sector: "Technology", price: 218, marketCap: 3400,
    data: { "2024": { revenue: 383, netIncome: 97.6, totalAssets: 336, totalDebt: 206, shareholdersEquity: 62, grossProfit: 185 },
            "2023": { revenue: 383.3, netIncome: 97, totalAssets: 352, totalDebt: 178, shareholdersEquity: 62.7, grossProfit: 185 },
            "2022": { revenue: 394.3, netIncome: 99.8, totalAssets: 346, totalDebt: 111, shareholdersEquity: 63.1, grossProfit: 191 } } },
  MSFT: { name: "Microsoft Corp.", sector: "Technology", price: 420, marketCap: 3100,
    data: { "2024": { revenue: 211.9, netIncome: 72.4, totalAssets: 412, totalDebt: 75, shareholdersEquity: 198, grossProfit: 147 },
            "2023": { revenue: 211.9, netIncome: 72, totalAssets: 387, totalDebt: 56, shareholdersEquity: 193, grossProfit: 146 },
            "2022": { revenue: 198.3, netIncome: 61.2, totalAssets: 365, totalDebt: 44, shareholdersEquity: 185, grossProfit: 137 } } },
  TSLA: { name: "Tesla Inc.", sector: "Automotive", price: 250, marketCap: 797,
    data: { "2024": { revenue: 97.7, netIncome: 15, totalAssets: 152, totalDebt: 47, shareholdersEquity: 52, grossProfit: 18 },
            "2023": { revenue: 96.8, netIncome: 15, totalAssets: 151, totalDebt: 45, shareholdersEquity: 50, grossProfit: 18 },
            "2022": { revenue: 81.5, netIncome: 12.6, totalAssets: 139, totalDebt: 39, shareholdersEquity: 43, grossProfit: 15 } } },
};

/* ---- persistence + sync ---- */
function load() { const r = localStorage.getItem("fincanvas-state"); if (r) Object.assign(state, JSON.parse(r)); }
function save() {
  localStorage.setItem("fincanvas-state", JSON.stringify(state));
  const bc = new (window.BroadcastChannel || function(){return{postMessage(){}}})("fincanvas");
  bc.postMessage({ type: "u", state: JSON.stringify(state) });
  window.dispatchEvent(new StorageEvent("storage", { key: "fincanvas-state", newValue: JSON.stringify(state) }));
}
window.addEventListener("storage", (e) => { if (e.key==="fincanvas-state" && e.newValue){ Object.assign(state, JSON.parse(e.newValue)); render(); } });
if ("BroadcastChannel" in window) { const bc = new BroadcastChannel("fincanvas"); bc.onmessage = (e)=>{ if(e.data?.type==="u"){ Object.assign(state, JSON.parse(e.data.state)); render(); } }; }

function ensureId(name, role) {
  const ex = Object.entries(state.identities).find(([,v]) => v.name === name);
  if (ex) return ex[0];
  const id = String(state.nextCreator++);
  state.identities[id] = { name, role: role || "analyst", history: [] };
  return id;
}

function log(m) { const el = document.getElementById("log"); el.textContent += m + "\n"; el.scrollTop = el.scrollHeight; }

/* ---- render ---- */
function render() {
  const svg = document.getElementById("canvas"); svg.innerHTML = "";
  state.paths.forEach((p) => {
    const l = document.createElementNS("http://www.w3.org/2000/svg","line");
    l.setAttribute("x1",p.fromX); l.setAttribute("y1",p.fromY); l.setAttribute("x2",p.toX); l.setAttribute("y2",p.toY);
    l.setAttribute("class","agent-path"); svg.appendChild(l);
  });
  state.companies.forEach((c,i) => {
    const x = 60, y = 40 + i*110;
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    const r = document.createElementNS("http://www.w3.org/2000/svg","rect");
    r.setAttribute("x",x); r.setAttribute("y",y); r.setAttribute("width",200); r.setAttribute("height",90); r.setAttribute("rx",8); r.setAttribute("class","company-card");
    g.appendChild(r);
    const t = document.createElementNS("http://www.w3.org/2000/svg","text"); t.setAttribute("x",x+12); t.setAttribute("y",y+22); t.setAttribute("class","ticker"); t.textContent = c.ticker; g.appendChild(t);
    const n = document.createElementNS("http://www.w3.org/2000/svg","text"); n.setAttribute("x",x+12); n.setAttribute("y",y+40); n.setAttribute("class","company-label"); n.textContent = c.name; g.appendChild(n);
    const s = document.createElementNS("http://www.w3.org/2000/svg","text"); s.setAttribute("x",x+12); s.setAttribute("y",y+56); s.setAttribute("class","note-label"); s.textContent = c.sector; g.appendChild(s);
    svg.appendChild(g);
    const years=["2022","2023","2024"]; const vals=years.map(y=>c.financials?.data?.[y]?.revenue||0); const maxV=Math.max(...vals,1);
    years.forEach((yr,idx)=>{ const px=x+40+idx*40, py=y+90-8-((vals[idx]/maxV)*24); const d=document.createElementNS("http://www.w3.org/2000/svg","circle"); d.setAttribute("cx",px); d.setAttribute("cy",py); d.setAttribute("r",4); d.setAttribute("class","chart-point"); svg.appendChild(d); });
  });
  state.notes.forEach((nt) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    const r = document.createElementNS("http://www.w3.org/2000/svg","rect");
    r.setAttribute("x",nt.x); r.setAttribute("y",nt.y); r.setAttribute("width",180); r.setAttribute("height",70); r.setAttribute("rx",8); r.setAttribute("class", nt.owner==="human"?"note-h":"note-a");
    g.appendChild(r);
    const tx = document.createElementNS("http://www.w3.org/2000/svg","text"); tx.setAttribute("x",nt.x+10); tx.setAttribute("y",nt.y+22); tx.textContent = nt.text.length>28?nt.text.slice(0,28)+"…":nt.text; g.appendChild(tx);
    if (nt.creator){ const tg=document.createElementNS("http://www.w3.org/2000/svg","text"); tg.setAttribute("x",nt.x+10); tg.setAttribute("y",nt.y+42); tg.setAttribute("class","note-label"); tg.textContent="@"+(state.identities[nt.creator]?.name||nt.creator); g.appendChild(tg); }
    svg.appendChild(g);
  });
  state.anomalies.forEach((a,i)=>{ const y=120+i*24; const g=document.createElementNS("http://www.w3.org/2000/svg","g"); const r=document.createElementNS("http://www.w3.org/2000/svg","rect"); r.setAttribute("x",760); r.setAttribute("y",y); r.setAttribute("width",220); r.setAttribute("height",20); r.setAttribute("rx",4); r.setAttribute("class","anomaly-flag"); g.appendChild(r); const tx=document.createElementNS("http://www.w3.org/2000/svg","text"); tx.setAttribute("x",770); tx.setAttribute("y",y+14); tx.setAttribute("fill","#fbbf24"); tx.textContent=a.ticker+" "+a.lineItem+": "+a.value; g.appendChild(tx); svg.appendChild(g); });
  renderLists();
}
function renderLists() {
  const cl = document.getElementById("company-list"); cl.innerHTML = "";
  state.companies.forEach((c,i)=>{ const li=document.createElement("li"); li.innerHTML=`<strong>${c.ticker}</strong> — ${c.name} <span class="del" onclick="removeCompany(${i})">✕</span>`; cl.appendChild(li); });
  const rl = document.getElementById("ratio-list"); rl.innerHTML = "";
  state.ratios.forEach((r)=>{ const li=document.createElement("li"); li.innerHTML=`<span>${r.ticker} ${r.ratio}</span><span class="v">${r.value.toFixed(2)}</span>`; rl.appendChild(li); });
  listToolsUI();
}
function listToolsUI() {
  const ul = document.getElementById("tool-list"); ul.innerHTML = "";
  ["create_company_profile","fetch_financials","add_note","add_data_point","calculate_ratio","highlight_anomaly","generate_hypothesis","apply_theme","restyle_component","list_companies","snapshot","list_tools"]
    .forEach((n)=>{ const li=document.createElement("li"); li.innerHTML=`<strong>${n}</strong>`; ul.appendChild(li); });
}
function removeCompany(i){ state.companies.splice(i,1); save(); render(); }

/* ---- WebMCP ---- */
if (window.document.modelContext && typeof window.document.modelContext.registerTool === "function") {
  const mc = window.document.modelContext;

  mc.registerTool({ name:"create_company_profile", description:"Add a company card to the canvas.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"}, name:{type:"string"}, sector:{type:"string"} }, required:["ticker","name","sector"] },
    execute: async (i)=>{ load(); state.companies.push({ ticker:i.ticker, name:i.name, sector:i.sector, financials:MOCK[i.ticker], notes:[] }); save(); log(`[+company] ${i.ticker}`); return { success:true }; } });

  mc.registerTool({ name:"fetch_financials", description:"Pull financial data for a ticker.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"} }, required:["ticker"] },
    execute: async (i)=>{ load(); const c=state.companies.find(c=>c.ticker===i.ticker); if(!c) return {success:false,error:"not on canvas"}; c.financials=MOCK[i.ticker]; save(); log(`[fetch] ${i.ticker} financials loaded`); return { success:true, financials:MOCK[i.ticker] }; } });

  mc.registerTool({ name:"add_note", description:"Place a note on the canvas. Creator tracked.",
    inputSchema:{ type:"object", properties:{ text:{type:"string"}, x:{type:"integer"}, y:{type:"integer"}, owner:{type:"string",enum:["human","agent"]}, creator:{type:"string"}, role:{type:"string",enum:["analyst","user"]} }, required:["text","x","y","owner"] },
    execute: async (i)=>{ load(); const cid=i.creator?ensureId(i.creator,i.role):ensureId(i.owner==="human"?"human":"ai-agent","analyst"); const n={ id:String(state.nextId++), text:i.text, x:i.x, y:i.y, owner:i.owner, creator:cid, createdAt:new Date().toISOString() }; state.notes.push(n); save(); log(`[note] ${n.owner}: ${n.text}`); return { success:true, noteId:n.id }; } });

  mc.registerTool({ name:"add_data_point", description:"Plot a financial metric for a company.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"}, year:{type:"string"}, metric:{type:"string"}, value:{type:"number"} }, required:["ticker","year","metric","value"] },
    execute: async (i)=>{ load(); const c=state.companies.find(c=>c.ticker===i.ticker); if(!c||!c.financials) return {success:false}; (c.financials.data[i.year]=c.financials.data[i.year]||{})[i.metric]=i.value; save(); log(`[data] ${i.ticker} ${i.metric}=${i.value}`); return { success:true }; } });

  mc.registerTool({ name:"calculate_ratio", description:"Compute a financial ratio for a company.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"}, ratio:{type:"string",enum:["P/E","ROE","Debt/Equity","Gross Margin","Net Margin"]}, year:{type:"string"} }, required:["ticker","ratio","year"] },
    execute: async (i)=>{ load(); const c=state.companies.find(c=>c.ticker===i.ticker); const d=c?.financials?.data?.[i.year]; if(!d) return {success:false}; let v=0;
      if(i.ratio==="P/E") v=c.financials.price?(c.financials.marketCap/d.netIncome):0;
      else if(i.ratio==="ROE") v=(d.netIncome/d.shareholdersEquity)*100;
      else if(i.ratio==="Debt/Equity") v=d.totalDebt/d.shareholdersEquity;
      else if(i.ratio==="Gross Margin") v=(d.grossProfit/d.revenue)*100;
      else if(i.ratio==="Net Margin") v=(d.netIncome/d.revenue)*100;
      state.ratios.push({ id:String(state.nextRatio++), ticker:i.ticker, ratio:i.ratio, value:v, year:i.year }); save(); log(`[ratio] ${i.ticker} ${i.ratio}=${v.toFixed(2)}`); return { success:true, value:v }; } });

  mc.registerTool({ name:"highlight_anomaly", description:"Flag a suspicious line item.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"}, lineItem:{type:"string"}, value:{type:"string"}, reason:{type:"string"} }, required:["ticker","lineItem","value"] },
    execute: async (i)=>{ load(); state.anomalies.push({ id:String(state.nextAnomaly++), ticker:i.ticker, lineItem:i.lineItem, value:i.value, reason:i.reason||"" }); save(); log(`[anomaly] ${i.ticker} ${i.lineItem}`); return { success:true }; } });

  mc.registerTool({ name:"generate_hypothesis", description:"Agent proposes an investment thesis.",
    inputSchema:{ type:"object", properties:{ ticker:{type:"string"}, creator:{type:"string"}, focus:{type:"string",enum:["growth","value","quality"]} }, required:["ticker"] },
    execute: async (i)=>{ load(); const f=i.focus||"quality"; const h={ growth:`${i.ticker} shows expanding margins — accumulate ahead of earnings.`, value:`${i.ticker} trades below sector P/E with strong cash flow — value play.`, quality:`${i.ticker} holds consistent ROE and disciplined debt — high quality.` }[f];
      const cid=i.creator?ensureId(i.creator,"analyst"):ensureId("ai-agent","analyst"); state.notes.push({ id:String(state.nextId++), text:h, x:780, y:120+Math.random()*180, owner:"agent", creator:cid, createdAt:new Date().toISOString() }); save(); log(`[hypothesis] ${i.ticker} → ${f}`); return { success:true, hypothesis:h }; } });

  /* 21st.dev UI tools */
  mc.registerTool({ name:"apply_theme", description:"Apply a 21st.dev design theme by setting CSS variables.",
    inputSchema:{ type:"object", properties:{ variant:{type:"string",enum:["cyber","midnight","emerald"]}, primary:{type:"string"} }, required:["variant"] },
    execute: async (i)=>{ const root=document.documentElement.style; const map={ cyber:["#020617","#22c55e"], midnight:["#0a0a0a","#3b82f6"], emerald:["#04140b","#10b981"] }; const [bg,ac]=i.primary?["#020617",i.primary]:map[i.variant]; root.setProperty("--background",bg); root.setProperty("--accent",ac); log(`[theme] ${i.variant}`); return { success:true }; } });

  mc.registerTool({ name:"restyle_component", description:"Restyle a DOM element live by CSS selector.",
    inputSchema:{ type:"object", properties:{ selector:{type:"string"}, styles:{type:"object"} }, required:["selector","styles"] },
    execute: async (i)=>{ const el=document.querySelector(i.selector); if(!el) return {success:false,error:"not found"}; Object.entries(i.styles).forEach(([k,v])=>el.style.setProperty(k.startsWith("--")?k:k.replace(/([A-Z])/g,"-$1").toLowerCase(),v)); log(`[restyle] ${i.selector}`); return { success:true }; } });

  mc.registerTool({ name:"list_companies", description:"List companies on canvas.",
    inputSchema:{ type:"object", properties:{} }, execute: async ()=>{ load(); return { companies: state.companies.map(c=>({ticker:c.ticker,name:c.name,sector:c.sector})) }; } });

  mc.registerTool({ name:"snapshot", description:"Export canvas state + reasoning trace.",
    inputSchema:{ type:"object", properties:{} }, execute: async ()=>{ load(); const snap={ timestamp:new Date().toISOString(), companies:state.companies, notes:state.notes, ratios:state.ratios, anomalies:state.anomalies, identities:state.identities }; log(`[snapshot] ${state.notes.length} notes`); return { success:true, snapshot:JSON.stringify(snap,null,2) }; } });

  mc.registerTool({ name:"list_tools", description:"Discover all tools on this page.",
    inputSchema:{ type:"object", properties:{} }, execute: async ()=>({ tools:["create_company_profile","fetch_financials","add_note","add_data_point","calculate_ratio","highlight_anomaly","generate_hypothesis","apply_theme","restyle_component","list_companies","snapshot","list_tools"] }) });

  mc.registerResource({ uriTemplate:"resource://fincanvas/state", description:"Full canvas state.", read: async ()=>{ load(); return { contents:[{ uri:"resource://fincanvas/state", text:JSON.stringify(state,null,2), mimeType:"application/json" }] }; } });
  mc.registerResource({ uriTemplate:"resource://fincanvas/company/{ticker}", description:"Single company financials.", read: async (p)=>{ load(); const c=state.companies.find(c=>c.ticker===p.ticker); return c?{ contents:[{ uri:`resource://fincanvas/company/${p.ticker}`, text:JSON.stringify(c,null,2), mimeType:"application/json" }] }:{ contents:[] }; } });
  mc.registerResource({ uriTemplate:"resource://fincanvas/ratios", description:"Computed ratios.", read: async ()=>{ load(); return { contents:[{ uri:"resource://fincanvas/ratios", text:JSON.stringify(state.ratios,null,2), mimeType:"application/json" }] }; } });

  log("WebMCP ready: 12 tools + 3 resources");
} else {
  log("WebMCP not detected — canvas works in standard mode.");
}

/* ---- human ---- */
function initHuman() {
  load();
  if (state.companies.length===0){ ensureId("human","user"); state.companies.push({ ticker:"AAPL", name:"Apple Inc.", sector:"Technology", financials:MOCK.AAPL, notes:[] }); save(); }
  document.getElementById("canvas").addEventListener("click",(e)=>{
    const pt=document.getElementById("canvas").createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const m=document.getElementById("canvas").getScreenCTM(); const s=pt.matrixTransform(m.inverse());
    if (window.document.modelContext){ window.document.modelContext.callTool("add_note",{ text:"❓ Question", x:Math.round(s.x), y:Math.round(s.y), owner:"human", creator:"human", role:"user" }).then(()=>{ load(); render(); }).catch(()=>{ const id=ensureId("human","user"); state.notes.push({id:String(state.nextId++),text:"❓ Question",x:Math.round(s.x),y:Math.round(s.y),owner:"human",creator:id,createdAt:new Date().toISOString()}); save(); render(); }); }
    else { const id=ensureId("human","user"); state.notes.push({id:String(state.nextId++),text:"❓ Question",x:Math.round(s.x),y:Math.round(s.y),owner:"human",creator:id,createdAt:new Date().toISOString()}); save(); render(); }
  });
}
load(); render(); listToolsUI(); initHuman();
log("FinCanvas ready. Click canvas to add a note. An AI agent can join via WebMCP.");
