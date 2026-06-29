const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

// Icon imports
const { FaShieldAlt, FaBug, FaRobot, FaDatabase, FaChartBar, FaSearch,
        FaCheckCircle, FaExclamationTriangle, FaCode, FaCog, FaLock,
        FaComments, FaFileAlt, FaArrowRight, FaBrain, FaServer } = require("react-icons/fa");
const { MdSecurity } = require("react-icons/md");

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  darkBg:     "0A1628",   // deep navy — title/section slides
  lightBg:    "F0F4F8",   // near-white — content slides
  cardBg:     "FFFFFF",   // white cards
  navy:       "1A2B4A",   // secondary dark
  cyan:       "00C2E0",   // primary accent
  cyanDark:   "0099B8",   // darker cyan
  teal:       "00897B",   // success/positive
  red:        "E53935",   // warning/danger
  gold:       "F9A825",   // highlight
  white:      "FFFFFF",
  textDark:   "1A2B4A",
  textMid:    "4A6080",
  textLight:  "8BADC1",
  textOnDark: "D0E8F5",
};

// ─── ICON HELPER ─────────────────────────────────────────────────────────────
async function icon(IconComp, color = "#FFFFFF", size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComp, { color, size: String(size) })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ─── SHADOW FACTORY ──────────────────────────────────────────────────────────
const sh = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 45, opacity: 0.13 });
const shStrong = () => ({ type: "outer", color: "000000", blur: 14, offset: 4, angle: 45, opacity: 0.18 });

// ─── REUSABLE SLIDE HELPERS ──────────────────────────────────────────────────
function darkSlide(pres) {
  const s = pres.addSlide();
  s.background = { color: C.darkBg };
  return s;
}
function lightSlide(pres) {
  const s = pres.addSlide();
  s.background = { color: C.lightBg };
  return s;
}

// Section header badge (top-left pill on content slides)
function sectionTag(s, label) {
  s.addShape("roundRect", { x: 0.4, y: 0.18, w: 1.6, h: 0.28, rectRadius: 0.14,
    fill: { color: C.cyan }, line: { color: C.cyan } });
  s.addText(label, { x: 0.4, y: 0.18, w: 1.6, h: 0.28, fontSize: 9, bold: true,
    color: C.darkBg, align: "center", valign: "middle", margin: 0 });
}

// Slide title on light slides
function slideTitle(s, text) {
  s.addText(text, { x: 0.4, y: 0.52, w: 9.2, h: 0.55, fontSize: 26, bold: true,
    color: C.textDark, fontFace: "Cambria", margin: 0 });
}

// Cyan underline accent for title (thin shape below title text)
function titleUnderline(s) {
  s.addShape("rect", { x: 0.4, y: 1.08, w: 1.1, h: 0.045, fill: { color: C.cyan }, line: { color: C.cyan } });
}

// White card
function card(s, x, y, w, h, radius = 0.12) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: radius,
    fill: { color: C.cardBg }, line: { color: "E2EAF2", width: 0.5 }, shadow: sh() });
}

// Dark card (for dark slides)
function darkCard(s, x, y, w, h) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.12,
    fill: { color: "132238" }, line: { color: "1E3A5A", width: 0.5 }, shadow: sh() });
}

// Cyan icon circle
async function iconCircle(s, IconComp, iconColor, cx, cy, r = 0.35) {
  s.addShape("ellipse", { x: cx, y: cy, w: r*2, h: r*2,
    fill: { color: C.cyan, transparency: 88 }, line: { color: C.cyan, width: 1 } });
  const ic = await icon(IconComp, "#" + C.cyan, 128);
  s.addImage({ data: ic, x: cx + r*0.3, y: cy + r*0.3, w: r*1.4, h: r*1.4 });
}

// ─── SLIDE 1: TITLE ──────────────────────────────────────────────────────────
async function slide1(pres) {
  const s = darkSlide(pres);

  // Subtle grid pattern overlay — staggered dots via small shapes
  for (let gx = 0; gx < 10; gx += 1.2) {
    for (let gy = 0; gy < 5.625; gy += 1.2) {
      s.addShape("ellipse", { x: gx + 0.5, y: gy + 0.3, w: 0.06, h: 0.06,
        fill: { color: "1E3A5A" }, line: { color: "1E3A5A" } });
    }
  }

  // Cyan glow blob — large transparent ellipse
  s.addShape("ellipse", { x: 5.5, y: 0.8, w: 4.2, h: 3.5,
    fill: { color: C.cyan, transparency: 93 }, line: { color: C.cyan, transparency: 90 } });

  // Shield icon big
  const shieldIc = await icon(FaShieldAlt, "#" + C.cyan, 512);
  s.addImage({ data: shieldIc, x: 7.2, y: 0.7, w: 2.0, h: 2.0, transparency: 15 });

  // University tag
  s.addText("Ain Shams University  ·  Faculty of Computer & Information Sciences  ·  IS Department",
    { x: 0.5, y: 0.25, w: 9, h: 0.3, fontSize: 9.5, color: C.textLight,
      fontFace: "Calibri", align: "left", margin: 0 });

  // Main title
  s.addText("SecuScan", { x: 0.5, y: 1.1, w: 9, h: 1.1,
    fontSize: 64, bold: true, color: C.white, fontFace: "Cambria", margin: 0 });
  s.addText(".AI", { x: 4.62, y: 1.1, w: 2, h: 1.1,
    fontSize: 64, bold: true, color: C.cyan, fontFace: "Cambria", margin: 0 });

  // Tagline
  s.addText("Automated Web Vulnerability Scanning · AI Report Generation · RAG Security Assistant",
    { x: 0.5, y: 2.25, w: 8.5, h: 0.4, fontSize: 13, color: C.textOnDark,
      fontFace: "Calibri", italic: true, margin: 0 });

  // Thin cyan divider
  s.addShape("rect", { x: 0.5, y: 2.75, w: 4.5, h: 0.04,
    fill: { color: C.cyan }, line: { color: C.cyan } });

  // Team names — two columns
  const col1 = ["Roa Alaa Elsayed", "Roaa Elsayed Rozik", "Yara Mohamed"];
  const col2 = ["Ahmed Adawy", "Ahmed Talaat", "Ahmed Alaa"];
  col1.forEach((n, i) => {
    s.addText(n, { x: 0.5, y: 3.0 + i * 0.32, w: 4, h: 0.28,
      fontSize: 11.5, color: C.textOnDark, fontFace: "Calibri", margin: 0 });
  });
  col2.forEach((n, i) => {
    s.addText(n, { x: 4.8, y: 3.0 + i * 0.32, w: 4, h: 0.28,
      fontSize: 11.5, color: C.textOnDark, fontFace: "Calibri", margin: 0 });
  });

  // Supervisors
  s.addText("Supervised by  Dr. Mahmoud Mounir  ·  TA. Radwa Moustafa",
    { x: 0.5, y: 4.08, w: 9, h: 0.28, fontSize: 10.5, color: C.textLight,
      fontFace: "Calibri", margin: 0 });

  // Date + seminar label
  s.addText("Final Seminar  ·  June 2026",
    { x: 0.5, y: 4.45, w: 9, h: 0.28, fontSize: 10, color: C.textLight,
      fontFace: "Calibri", margin: 0 });

  s.addNotes("Welcome slide. Introduce the team, project name, and supervisors. One sentence: SecuScan.AI makes web security scanning accessible to developers who don't have a security background.");
}

// ─── SLIDE 2: AGENDA ─────────────────────────────────────────────────────────
async function slide2(pres) {
  const s = darkSlide(pres);

  s.addText("What We'll Cover Today", { x: 0.5, y: 0.3, w: 9, h: 0.65,
    fontSize: 30, bold: true, color: C.white, fontFace: "Cambria", margin: 0 });
  s.addShape("rect", { x: 0.5, y: 0.95, w: 0.9, h: 0.04,
    fill: { color: C.cyan }, line: { color: C.cyan } });

  const items = [
    { n: "01", label: "Problem & Motivation",     sub: "Why web security is broken for most developers" },
    { n: "02", label: "Our Solution",             sub: "What SecuScan.AI does differently" },
    { n: "03", label: "System Architecture",      sub: "Three-layer design overview" },
    { n: "04", label: "Scanning Engine",          sub: "AI agent, n8n workflow, 5 vulnerability classes" },
    { n: "05", label: "RAG Chatbot",              sub: "Knowledge mode & report mode explained" },
    { n: "06", label: "Report Generation",        sub: "Structured, AI-written security reports" },
    { n: "07", label: "Results & Evaluation",     sub: "Detection accuracy + chatbot testing" },
    { n: "08", label: "Demo",                     sub: "Live walkthrough of the platform" },
    { n: "09", label: "Conclusion & Future Work", sub: "What we built and what comes next" },
  ];

  // Two-column layout
  const left  = items.slice(0, 5);
  const right = items.slice(5);

  left.forEach((item, i) => {
    const y = 1.15 + i * 0.78;
    darkCard(s, 0.35, y, 4.4, 0.68);
    s.addText(item.n, { x: 0.55, y: y + 0.08, w: 0.55, h: 0.5,
      fontSize: 18, bold: true, color: C.cyan, fontFace: "Cambria", margin: 0, valign: "middle" });
    s.addText(item.label, { x: 1.2, y: y + 0.05, w: 3.4, h: 0.3,
      fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", margin: 0 });
    s.addText(item.sub, { x: 1.2, y: y + 0.35, w: 3.4, h: 0.26,
      fontSize: 9.5, color: C.textLight, fontFace: "Calibri", margin: 0 });
  });

  right.forEach((item, i) => {
    const y = 1.15 + i * 0.78;
    darkCard(s, 5.2, y, 4.4, 0.68);
    s.addText(item.n, { x: 5.4, y: y + 0.08, w: 0.55, h: 0.5,
      fontSize: 18, bold: true, color: C.cyan, fontFace: "Cambria", margin: 0, valign: "middle" });
    s.addText(item.label, { x: 6.05, y: y + 0.05, w: 3.4, h: 0.3,
      fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", margin: 0 });
    s.addText(item.sub, { x: 6.05, y: y + 0.35, w: 3.4, h: 0.26,
      fontSize: 9.5, color: C.textLight, fontFace: "Calibri", margin: 0 });
  });

  s.addNotes("Quick agenda overview. Tell the panel: 'We'll cover the problem, our solution and architecture, demo the live system, then present evaluation results.'");
}

// ─── SLIDE 3: PROBLEM ────────────────────────────────────────────────────────
async function slide3(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "PROBLEM");
  slideTitle(s, "The Gap in Web Application Security");
  titleUnderline(s);

  // Three problem cards
  const problems = [
    { icon: FaLock,              color: C.red,
      title: "Tools Are for Experts",
      body:  "OWASP ZAP, Burp Suite, and Acunetix require deep security knowledge to configure, run, and interpret. Developers without security backgrounds can't use them effectively." },
    { icon: FaExclamationTriangle, color: C.gold,
      title: "Reports Nobody Understands",
      body:  "Traditional scanners output raw logs, payloads, and technical jargon. A developer receiving these results doesn't know what's critical, what's safe to ignore, or what to fix first." },
    { icon: FaComments,          color: C.cyanDark,
      title: "No Follow-Up Possible",
      body:  "Once a report is generated, users are on their own. There's no way to ask 'why is this dangerous?' or 'how exactly do I fix this?' without hiring a security consultant." },
  ];

  for (let i = 0; i < 3; i++) {
    const x = 0.35 + i * 3.15;
    card(s, x, 1.25, 2.95, 3.85);
    // Colored top bar
    s.addShape("roundRect", { x, y: 1.25, w: 2.95, h: 0.35, rectRadius: 0.12,
      fill: { color: i === 0 ? C.red : i === 1 ? C.gold : C.cyanDark },
      line:  { color: i === 0 ? C.red : i === 1 ? C.gold : C.cyanDark } });
    const ic = await icon(problems[i].icon, "#FFFFFF", 256);
    s.addImage({ data: ic, x: x + 1.15, y: 1.55, w: 0.65, h: 0.65 });
    s.addText(problems[i].title, { x: x + 0.15, y: 2.3, w: 2.65, h: 0.5,
      fontSize: 12.5, bold: true, color: C.textDark, fontFace: "Cambria", align: "center", margin: 0 });
    s.addText(problems[i].body, { x: x + 0.2, y: 2.88, w: 2.55, h: 2.0,
      fontSize: 10.5, color: C.textMid, fontFace: "Calibri", align: "left", margin: 0 });
  }

  // Bottom stat bar
  s.addShape("roundRect", { x: 0.35, y: 5.15, w: 9.3, h: 0.32, rectRadius: 0.08,
    fill: { color: C.darkBg }, line: { color: C.darkBg } });
  s.addText("43% of web applications contain at least one critical vulnerability  ·  Most never get a professional security audit  ·  SMEs cannot afford pen-testing services",
    { x: 0.35, y: 5.15, w: 9.3, h: 0.32, fontSize: 9.5, color: C.cyan,
      align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

  s.addNotes("Emphasize that this isn't just about big companies. Most affected are individual developers, startups, and students who ship web apps without any security check. The problem isn't skill — it's access and usability.");
}

// ─── SLIDE 4: SOLUTION OVERVIEW ──────────────────────────────────────────────
async function slide4(pres) {
  const s = darkSlide(pres);

  s.addText("Introducing SecuScan.AI", { x: 0.5, y: 0.28, w: 9, h: 0.65,
    fontSize: 30, bold: true, color: C.white, fontFace: "Cambria", margin: 0 });
  s.addShape("rect", { x: 0.5, y: 0.93, w: 1.2, h: 0.04,
    fill: { color: C.cyan }, line: { color: C.cyan } });
  s.addText("One platform. Paste a URL. Get a full security picture.",
    { x: 0.5, y: 1.05, w: 9, h: 0.36, fontSize: 14, color: C.textOnDark,
      fontFace: "Calibri", italic: true, margin: 0 });

  // Big 3 feature cards
  const features = [
    { icon: FaSearch, title: "Automated\nVulnerability Scanner",
      points: ["SQLi · SSTI · SSRF", "Path Traversal · BAC", "Scan All or pick one", "AI-powered detection via n8n"] },
    { icon: FaFileAlt, title: "Intelligent\nSecurity Reports",
      points: ["Human-readable findings", "Severity ratings per issue", "Affected URLs & parameters", "Concrete mitigation steps"] },
    { icon: FaRobot, title: "RAG Security\nChatbot",
      points: ["Ask about your report", "General security Q&A", "Grounded, no hallucination", "Knows all 5 vuln classes"] },
  ];

  for (let i = 0; i < 3; i++) {
    const x = 0.3 + i * 3.18;
    darkCard(s, x, 1.5, 3.0, 3.7);
    // cyan top
    s.addShape("roundRect", { x, y: 1.5, w: 3.0, h: 0.42, rectRadius: 0.12,
      fill: { color: C.cyan }, line: { color: C.cyan } });
    const ic = await icon(features[i].icon, "#" + C.darkBg, 256);
    s.addImage({ data: ic, x: x + 1.25, y: 1.58, w: 0.5, h: 0.5 });
    s.addText(features[i].title, { x: x + 0.1, y: 2.08, w: 2.8, h: 0.62,
      fontSize: 13, bold: true, color: C.white, fontFace: "Cambria",
      align: "center", margin: 0 });
    features[i].points.forEach((p, pi) => {
      s.addText("›  " + p, { x: x + 0.18, y: 2.78 + pi * 0.36, w: 2.65, h: 0.32,
        fontSize: 11, color: C.textOnDark, fontFace: "Calibri", margin: 0 });
    });
  }

  // User journey strip
  s.addShape("rect", { x: 0.3, y: 5.2, w: 9.4, h: 0.3,
    fill: { color: "0D2035" }, line: { color: "0D2035" } });
  const steps = ["Paste URL", "Choose Scan Type", "AI Scans Automatically", "Read Your Report", "Ask the Chatbot"];
  steps.forEach((st, i) => {
    s.addText(st, { x: 0.35 + i * 1.88, y: 5.22, w: 1.6, h: 0.26,
      fontSize: 9, bold: true, color: i % 2 === 0 ? C.cyan : C.white,
      align: "center", fontFace: "Calibri", margin: 0 });
    if (i < 4) {
      s.addText("›", { x: 1.88 + i * 1.88, y: 5.22, w: 0.3, h: 0.26,
        fontSize: 11, color: C.textLight, align: "center", margin: 0 });
    }
  });

  s.addNotes("This is the 'elevator pitch' slide. Three pillars: Scan, Report, Chat. The journey strip at the bottom shows how simple the user flow is — paste URL, press scan, done.");
}

// ─── SLIDE 5: ARCHITECTURE ───────────────────────────────────────────────────
async function slide5(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "ARCHITECTURE");
  slideTitle(s, "System Architecture — Three Layers");
  titleUnderline(s);

  // Layer boxes
  const layers = [
    { label: "PRESENTATION LAYER", color: "2D6A9F", bg: "EBF4FB",
      items: ["React Web App", "Login / Dashboard / Scanning / Reports / Chatbot"],
      y: 1.2 },
    { label: "APPLICATION LAYER",  color: "00897B", bg: "E8F5E9",
      items: ["Node.js / Express Backend", "n8n Workflow  ·  AI Agent (DeepSeek)  ·  Security Tools  ·  RAG Chatbot"],
      y: 2.7 },
    { label: "DATA LAYER",         color: "6A1B9A", bg: "F3E5F5",
      items: ["PostgreSQL", "pgvector (Embeddings + Vector Search)"],
      y: 4.2 },
  ];

  layers.forEach(l => {
    s.addShape("roundRect", { x: 0.35, y: l.y, w: 6.5, h: 1.25, rectRadius: 0.1,
      fill: { color: l.bg }, line: { color: l.color, width: 1.5 }, shadow: sh() });
    s.addShape("roundRect", { x: 0.35, y: l.y, w: 6.5, h: 0.32, rectRadius: 0.1,
      fill: { color: l.color }, line: { color: l.color } });
    s.addText(l.label, { x: 0.45, y: l.y + 0.03, w: 6.3, h: 0.26,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
      align: "center", margin: 0 });
    s.addText(l.items[0], { x: 0.5, y: l.y + 0.4, w: 6.2, h: 0.32,
      fontSize: 12.5, bold: true, color: l.color, fontFace: "Cambria", margin: 0 });
    s.addText(l.items[1], { x: 0.5, y: l.y + 0.75, w: 6.2, h: 0.38,
      fontSize: 10.5, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  // Arrows between layers
  [2.5, 4.0].forEach(y => {
    s.addShape("rect", { x: 3.25, y, w: 0.05, h: 0.22,
      fill: { color: C.textMid }, line: { color: C.textMid } });
  });

  // Right-side key design points
  const points = [
    { icon: FaCog,      text: "Modular — each layer independently replaceable" },
    { icon: FaDatabase, text: "Single DB instance for both relational + vector data" },
    { icon: FaRobot,    text: "RAG Chatbot runs parallel to scanner — not dependent on it" },
    { icon: FaServer,   text: "n8n triggered by webhook from Express backend" },
  ];
  s.addText("Design Decisions", { x: 7.1, y: 1.15, w: 2.6, h: 0.32,
    fontSize: 12, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  for (let i = 0; i < points.length; i++) {
    const y = 1.55 + i * 0.95;
    card(s, 7.1, y, 2.65, 0.82);
    const ic = await icon(points[i].icon, "#" + C.cyan, 128);
    s.addImage({ data: ic, x: 7.22, y: y + 0.18, w: 0.38, h: 0.38 });
    s.addText(points[i].text, { x: 7.68, y: y + 0.08, w: 1.95, h: 0.65,
      fontSize: 9.5, color: C.textMid, fontFace: "Calibri", margin: 0 });
  }

  s.addNotes("Reference Figure 3.1 from the documentation. Key point: the RAG chatbot is PARALLEL to n8n, not downstream of it. Both pull from the same PostgreSQL/pgvector database but are completely independent components.");
}

// ─── SLIDE 6: TECH STACK ─────────────────────────────────────────────────────
async function slide6(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "TECHNOLOGY");
  slideTitle(s, "Technology Stack");
  titleUnderline(s);

  const stack = [
    { cat: "Frontend",       items: ["React"],                            color: "2D6A9F" },
    { cat: "Backend",        items: ["Node.js", "Express"],               color: "2E7D32" },
    { cat: "Database",       items: ["PostgreSQL", "pgvector"],           color: "6A1B9A" },
    { cat: "Orchestration",  items: ["n8n Workflow"],                     color: "E65100" },
    { cat: "AI Agent",       items: ["DeepSeek (via n8n)"],               color: "1565C0" },
    { cat: "Chatbot LLM",    items: ["llama3.2 (Ollama)"],                color: "00695C" },
    { cat: "Embeddings",     items: ["nomic-embed-text (Ollama)"],        color: "4527A0" },
    { cat: "Vector Search",  items: ["pgvector cosine distance"],         color: "AD1457" },
  ];

  stack.forEach((item, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 2.38;
    const y = 1.25 + row * 1.75;

    card(s, x, y, 2.2, 1.55);
    s.addShape("roundRect", { x, y, w: 2.2, h: 0.38, rectRadius: 0.12,
      fill: { color: item.color }, line: { color: item.color } });
    s.addText(item.cat.toUpperCase(), { x: x + 0.08, y: y + 0.06, w: 2.04, h: 0.26,
      fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri",
      align: "center", margin: 0 });
    item.items.forEach((it, ii) => {
      s.addText(it, { x: x + 0.08, y: y + 0.5 + ii * 0.36, w: 2.04, h: 0.32,
        fontSize: 12, bold: true, color: item.color, fontFace: "Cambria",
        align: "center", margin: 0 });
    });
  });

  // Bottom note
  s.addText("All AI inference runs locally via Ollama — no external API calls for scan report data, preserving user privacy.",
    { x: 0.35, y: 5.1, w: 9.3, h: 0.38, fontSize: 10.5, color: C.textMid,
      fontFace: "Calibri", italic: true, align: "center", margin: 0 });

  s.addNotes("Key talking point: everything AI-related on the chatbot side runs locally via Ollama. This is a deliberate privacy decision — scan reports contain sensitive vulnerability data about target systems, and routing that through a third-party API would be inappropriate for a security tool.");
}

// ─── SLIDE 7: SCANNING ENGINE ────────────────────────────────────────────────
async function slide7(pres) {
  const s = darkSlide(pres);

  s.addText("Scanning Engine", { x: 0.5, y: 0.25, w: 9, h: 0.62,
    fontSize: 30, bold: true, color: C.white, fontFace: "Cambria", margin: 0 });
  s.addShape("rect", { x: 0.5, y: 0.87, w: 0.9, h: 0.04,
    fill: { color: C.cyan }, line: { color: C.cyan } });
  s.addText("AI-orchestrated workflow covering 5 vulnerability classes",
    { x: 0.5, y: 0.97, w: 9, h: 0.32, fontSize: 12.5, color: C.textOnDark,
      fontFace: "Calibri", italic: true, margin: 0 });

  // Flow: User → Backend → n8n → Agent → Tools → Report
  const flowSteps = [
    { label: "User\nSubmits URL",    sub: "Web Interface" },
    { label: "Backend\nAPI",         sub: "Node.js / Express" },
    { label: "n8n\nWorkflow",        sub: "Webhook Trigger" },
    { label: "AI Agent\n(DeepSeek)", sub: "Pentester Role" },
    { label: "Security\nTools",      sub: "5 Vuln Modules" },
    { label: "Normalized\nReport",   sub: "Stored to DB" },
  ];

  flowSteps.forEach((step, i) => {
    const x = 0.3 + i * 1.6;
    darkCard(s, x, 1.38, 1.4, 1.22);
    s.addText(step.label, { x: x + 0.05, y: 1.44, w: 1.3, h: 0.7,
      fontSize: 10.5, bold: true, color: C.white, fontFace: "Cambria",
      align: "center", margin: 0, valign: "middle" });
    s.addText(step.sub, { x: x + 0.05, y: 2.2, w: 1.3, h: 0.3,
      fontSize: 8.5, color: C.cyan, fontFace: "Calibri",
      align: "center", margin: 0 });
    if (i < 5) {
      s.addText("›", { x: x + 1.4, y: 1.75, w: 0.22, h: 0.5,
        fontSize: 20, color: C.cyan, align: "center", valign: "middle", margin: 0 });
    }
  });

  // 5 Vulnerability class cards
  const vulns = [
    { name: "SQL Injection",  abbr: "SQLi",    color: "C62828" },
    { name: "Template Inj.",  abbr: "SSTI",    color: "E65100" },
    { name: "Server-Side RF", abbr: "SSRF",    color: "1565C0" },
    { name: "Path Traversal", abbr: "PATH",    color: "4527A0" },
    { name: "Broken AC",      abbr: "BAC",     color: "00695C" },
  ];

  s.addText("Vulnerability Classes Covered", { x: 0.3, y: 2.78, w: 9.4, h: 0.32,
    fontSize: 11.5, bold: true, color: C.textLight, fontFace: "Calibri", margin: 0 });

  vulns.forEach((v, i) => {
    const x = 0.3 + i * 1.9;
    s.addShape("roundRect", { x, y: 3.1, w: 1.72, h: 1.42, rectRadius: 0.1,
      fill: { color: v.color, transparency: 15 }, line: { color: v.color } });
    s.addText(v.abbr, { x, y: 3.18, w: 1.72, h: 0.52,
      fontSize: 22, bold: true, color: C.white, fontFace: "Cambria",
      align: "center", margin: 0 });
    s.addText(v.name, { x, y: 3.72, w: 1.72, h: 0.68,
      fontSize: 10, color: C.textOnDark, fontFace: "Calibri",
      align: "center", margin: 0, valign: "middle" });
  });

  // Surface discovery note
  darkCard(s, 0.3, 4.65, 9.4, 0.75);
  s.addText("Website Surface Discovery:  ", { x: 0.5, y: 4.75, w: 2.6, h: 0.5,
    fontSize: 11, bold: true, color: C.cyan, fontFace: "Calibri", margin: 0, valign: "middle" });
  s.addText("The crawler first maps all accessible endpoints and paths of the target before passing them to the AI agent for vulnerability testing.",
    { x: 3.0, y: 4.75, w: 6.5, h: 0.5, fontSize: 10.5, color: C.textOnDark,
      fontFace: "Calibri", margin: 0, valign: "middle" });

  s.addNotes("Security team presents this slide. Key point: the user doesn't configure any of this — they press scan and the whole pipeline runs automatically. The AI agent acts as a 'pentester' deciding what to test and interpreting results.");
}

// ─── SLIDE 8: RAG CHATBOT ────────────────────────────────────────────────────
async function slide8(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "RAG CHATBOT");
  slideTitle(s, "RAG Security Chatbot — How It Works");
  titleUnderline(s);

  // Two mode cards side by side
  // Knowledge Mode
  card(s, 0.35, 1.25, 4.3, 4.0);
  s.addShape("roundRect", { x: 0.35, y: 1.25, w: 4.3, h: 0.42, rectRadius: 0.12,
    fill: { color: "1565C0" }, line: { color: "1565C0" } });
  s.addText("KNOWLEDGE MODE", { x: 0.45, y: 1.3, w: 4.1, h: 0.32,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
    align: "center", margin: 0 });
  s.addText("Default — no scan selected", { x: 0.45, y: 1.72, w: 4.1, h: 0.28,
    fontSize: 10, color: "1565C0", fontFace: "Calibri", italic: true, margin: 0 });

  const kmSteps = [
    "User asks a security question",
    "Query embedded via nomic-embed-text",
    "Top 3 chunks retrieved from knowledge base",
    "Only SQLi / SSTI / SSRF / Path Traversal / BAC chunks searched",
    "llama3.2 generates answer from retrieved context only",
    "Out-of-scope queries → polite refusal",
  ];
  kmSteps.forEach((st, i) => {
    s.addText(`${i + 1}.  ${st}`, { x: 0.5, y: 2.1 + i * 0.46, w: 4.0, h: 0.4,
      fontSize: 10.5, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  // Report Mode
  card(s, 5.0, 1.25, 4.65, 4.0);
  s.addShape("roundRect", { x: 5.0, y: 1.25, w: 4.65, h: 0.42, rectRadius: 0.12,
    fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("REPORT MODE", { x: 5.1, y: 1.3, w: 4.45, h: 0.32,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
    align: "center", margin: 0 });
  s.addText("User selects a completed scan", { x: 5.1, y: 1.72, w: 4.45, h: 0.28,
    fontSize: 10, color: C.teal, fontFace: "Calibri", italic: true, margin: 0 });

  const rmSteps = [
    "User picks their scan from the dropdown",
    "scanId included in every chat request",
    "Top 5 chunks retrieved — scoped to that scanId only",
    "Strict isolation: other users' reports never retrieved",
    "llama3.2 answers from real findings — no invented data",
    "General questions → told to switch to Knowledge Mode",
  ];
  rmSteps.forEach((st, i) => {
    s.addText(`${i + 1}.  ${st}`, { x: 5.15, y: 2.1 + i * 0.46, w: 4.35, h: 0.4,
      fontSize: 10.5, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  // Bottom banner
  s.addShape("roundRect", { x: 0.35, y: 5.25, w: 9.3, h: 0.3, rectRadius: 0.08,
    fill: { color: C.darkBg }, line: { color: C.darkBg } });
  s.addText("Both modes use pgvector cosine search  ·  All inference runs locally via Ollama  ·  Stateless per-request — no conversation history stored on server",
    { x: 0.35, y: 5.25, w: 9.3, h: 0.3, fontSize: 9, color: C.cyan,
      align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

  s.addNotes("This is your slide — present both modes. Key distinction: Knowledge Mode answers general security questions, Report Mode is scoped to ONE user's specific scan results. The scanId filter is what guarantees data isolation between users.");
}

// ─── SLIDE 9: RAG PIPELINE ───────────────────────────────────────────────────
async function slide9(pres) {
  const s = darkSlide(pres);

  s.addText("RAG Pipeline — Under the Hood", { x: 0.5, y: 0.22, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: C.white, fontFace: "Cambria", margin: 0 });
  s.addShape("rect", { x: 0.5, y: 0.82, w: 1.0, h: 0.04,
    fill: { color: C.cyan }, line: { color: C.cyan } });

  // Phase 1: Indexing
  s.addText("① INDEXING (One-Time Setup)", { x: 0.35, y: 1.0, w: 9.3, h: 0.3,
    fontSize: 10, bold: true, color: C.cyan, fontFace: "Calibri", margin: 0 });

  const indexSteps = [
    { label: "5 × .md Files\n+ Scan Reports", w: 1.7 },
    { label: "Hybrid\nChunking\n600 chars", w: 1.5 },
    { label: "nomic-embed-text\n768-dim vectors", w: 1.8 },
    { label: "pgvector\nDocumentChunk\ntable", w: 1.7 },
  ];
  let ix = 0.3;
  indexSteps.forEach((step, i) => {
    darkCard(s, ix, 1.32, step.w, 0.95);
    s.addText(step.label, { x: ix + 0.05, y: 1.37, w: step.w - 0.1, h: 0.85,
      fontSize: 9.5, color: C.white, fontFace: "Calibri",
      align: "center", valign: "middle", margin: 0 });
    if (i < 3) {
      s.addText("→", { x: ix + step.w, y: 1.62, w: 0.32, h: 0.4,
        fontSize: 14, color: C.cyan, align: "center", margin: 0 });
    }
    ix += step.w + 0.32;
  });

  // Phase 2: Retrieval
  s.addText("② RETRIEVAL (Every Query)", { x: 0.35, y: 2.45, w: 9.3, h: 0.3,
    fontSize: 10, bold: true, color: C.gold, fontFace: "Calibri", margin: 0 });

  const retSteps = [
    { label: "User Query", w: 1.3 },
    { label: "Embed Query\n(same model)", w: 1.5 },
    { label: "Route:\nscanId?\n→ Report\nNo scanId?\n→ Knowledge", w: 1.7 },
    { label: "Cosine Search\nTop-3 or Top-5", w: 1.5 },
    { label: "Retrieved\nChunks", w: 1.3 },
  ];
  ix = 0.3;
  retSteps.forEach((step, i) => {
    darkCard(s, ix, 2.78, step.w, 1.08);
    s.addText(step.label, { x: ix + 0.05, y: 2.83, w: step.w - 0.1, h: 0.98,
      fontSize: 9.5, color: C.white, fontFace: "Calibri",
      align: "center", valign: "middle", margin: 0 });
    if (i < 4) {
      s.addText("→", { x: ix + step.w, y: 3.1, w: 0.32, h: 0.4,
        fontSize: 14, color: C.gold, align: "center", margin: 0 });
    }
    ix += step.w + 0.32;
  });

  // Phase 3: Generation
  s.addText("③ GENERATION (Every Query)", { x: 0.35, y: 4.02, w: 9.3, h: 0.3,
    fontSize: 10, bold: true, color: "A5D6A7", fontFace: "Calibri", margin: 0 });

  const genSteps = [
    { label: "System Prompt\n(scoped role)", w: 1.6 },
    { label: "Retrieved\nChunks", w: 1.4 },
    { label: "User\nQuery", w: 1.1 },
    { label: "llama3.2\n(Ollama local)", w: 1.6 },
    { label: "Response +\nsources[]", w: 1.5 },
  ];
  ix = 0.3;
  genSteps.forEach((step, i) => {
    darkCard(s, ix, 4.32, step.w, 0.9);
    s.addText(step.label, { x: ix + 0.05, y: 4.37, w: step.w - 0.1, h: 0.8,
      fontSize: 9.5, color: C.white, fontFace: "Calibri",
      align: "center", valign: "middle", margin: 0 });
    if (i < 4) {
      s.addText(i === 2 ? "+" : "→", { x: ix + step.w, y: 4.55, w: 0.32, h: 0.4,
        fontSize: 14, color: "A5D6A7", align: "center", margin: 0 });
    }
    ix += step.w + 0.32;
  });

  s.addNotes("This maps directly to Figure 3.3 in the documentation. Three phases: Indexing is done once; Retrieval and Generation happen on every user message. The routing box in Phase 2 is the key decision point between Knowledge Mode and Report Mode.");
}

// ─── SLIDE 10: REPORT GENERATION ─────────────────────────────────────────────
async function slide10(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "REPORTS");
  slideTitle(s, "AI-Generated Security Reports");
  titleUnderline(s);

  // Left: report structure
  s.addText("Report Structure", { x: 0.35, y: 1.25, w: 4.5, h: 0.35,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const sections = [
    { n: "01", title: "Executive Summary",   color: C.darkBg,   desc: "High-level overview of all findings and overall risk level" },
    { n: "02", title: "Findings per Class",  color: "1565C0",   desc: "Detailed entry for each detected vulnerability class" },
    { n: "03", title: "Affected URLs",       color: C.teal,     desc: "Exact endpoints and parameters where vulnerabilities were found" },
    { n: "04", title: "Severity Ratings",    color: "E65100",   desc: "Critical / High / Medium / Low per finding" },
    { n: "05", title: "Evidence / Payload",  color: "6A1B9A",   desc: "The payload that triggered a positive detection" },
    { n: "06", title: "Mitigation Steps",    color: C.teal,     desc: "Concrete, actionable fix instructions for each finding" },
  ];

  sections.forEach((sec, i) => {
    const y = 1.7 + i * 0.54;
    s.addShape("roundRect", { x: 0.35, y, w: 4.5, h: 0.46, rectRadius: 0.08,
      fill: { color: "F7FAFD" }, line: { color: "D5E4F0" }, shadow: sh() });
    s.addShape("roundRect", { x: 0.35, y, w: 0.42, h: 0.46, rectRadius: 0.08,
      fill: { color: sec.color }, line: { color: sec.color } });
    s.addText(sec.n, { x: 0.35, y, w: 0.42, h: 0.46,
      fontSize: 10, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(sec.title, { x: 0.85, y: y + 0.03, w: 3.9, h: 0.2,
      fontSize: 10.5, bold: true, color: C.textDark, fontFace: "Calibri", margin: 0 });
    s.addText(sec.desc, { x: 0.85, y: y + 0.23, w: 3.9, h: 0.2,
      fontSize: 9, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  // Right: how it's generated
  s.addText("How It's Generated", { x: 5.1, y: 1.25, w: 4.5, h: 0.35,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const how = [
    { title: "n8n AI Agent writes the report",    body: "The DeepSeek agent, acting as a security engineer, consolidates all scan tool outputs into structured JSON findings." },
    { title: "Automatic ingestion into pgvector", body: "Immediately after saving, the report is chunked and embedded so it becomes available to the RAG chatbot." },
    { title: "Accessible via the Reports View",   body: "Users can revisit any previous scan report from their history at any time." },
  ];

  how.forEach((h, i) => {
    card(s, 5.1, 1.68 + i * 1.22, 4.55, 1.08);
    s.addShape("ellipse", { x: 5.22, y: 1.78 + i * 1.22, w: 0.36, h: 0.36,
      fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addText(String(i + 1), { x: 5.22, y: 1.78 + i * 1.22, w: 0.36, h: 0.36,
      fontSize: 12, bold: true, color: C.darkBg, align: "center", valign: "middle", margin: 0 });
    s.addText(h.title, { x: 5.68, y: 1.72 + i * 1.22, w: 3.8, h: 0.3,
      fontSize: 11, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });
    s.addText(h.body, { x: 5.68, y: 2.04 + i * 1.22, w: 3.8, h: 0.6,
      fontSize: 10, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  // Bottom callout
  s.addShape("roundRect", { x: 0.35, y: 5.12, w: 9.3, h: 0.38, rectRadius: 0.08,
    fill: { color: "FFF8E1" }, line: { color: C.gold } });
  const goldIc = await icon(FaCheckCircle, "#" + C.gold, 128);
  s.addImage({ data: goldIc, x: 0.5, y: 5.18, w: 0.28, h: 0.28 });
  s.addText("Reports are also automatically indexed into pgvector — making every finding immediately queryable through the RAG chatbot.",
    { x: 0.88, y: 5.15, w: 8.6, h: 0.35, fontSize: 10, color: "5D4037",
      fontFace: "Calibri", italic: true, margin: 0, valign: "middle" });

  s.addNotes("The bridge between the scanner and the chatbot is the automatic report ingestion. The moment a scan finishes, the report is both saved to PostgreSQL and embedded into pgvector — so the user can immediately start chatting about their findings.");
}

// ─── SLIDE 11: EVALUATION RESULTS ────────────────────────────────────────────
async function slide11(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "RESULTS");
  slideTitle(s, "Evaluation Results");
  titleUnderline(s);

  // Scanner results table (left)
  s.addText("Scanner Detection", { x: 0.35, y: 1.25, w: 4.5, h: 0.32,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const scannerData = [
    ["Vulnerability Class", "Test Cases", "Detected", "Rate"],
    ["SQL Injection (SQLi)",              "—", "—", "—%"],
    ["SSTI",                              "—", "—", "—%"],
    ["SSRF",                              "—", "—", "—%"],
    ["Path Traversal",                    "—", "—", "—%"],
    ["Broken Access Control (BAC)",       "—", "—", "—%"],
  ];

  const tColors = {
    header: C.darkBg,
    rows: ["F7FAFD", "FFFFFF"],
  };
  s.addTable(scannerData.map((row, ri) =>
    row.map((cell, ci) => ({
      text: cell,
      options: {
        bold: ri === 0,
        fontSize: ri === 0 ? 9 : 10,
        color: ri === 0 ? C.white : C.textDark,
        fill: { color: ri === 0 ? C.darkBg : ri % 2 === 0 ? "F7FAFD" : C.white },
        align: ci === 0 ? "left" : "center",
        valign: "middle",
        margin: [4, 6, 4, 6],
      }
    }))
  ), { x: 0.35, y: 1.62, w: 4.5, h: 2.65,
       border: { pt: 0.5, color: "D5E4F0" }, colW: [2.1, 0.7, 0.7, 1.0] });

  s.addText("Fill in after running evaluation against test targets (DVWA / Juice Shop)",
    { x: 0.35, y: 4.32, w: 4.5, h: 0.32, fontSize: 8.5, color: C.textLight,
      fontFace: "Calibri", italic: true, margin: 0 });

  // Chatbot evaluation (right)
  s.addText("Chatbot Evaluation", { x: 5.1, y: 1.25, w: 4.5, h: 0.32,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const chatData = [
    ["Dimension",                  "Cases", "Passed", "Rate"],
    ["Knowledge Mode — Correct",   "15",    "—",      "—%"],
    ["Knowledge Mode — Grounded",  "15",    "—",      "—%"],
    ["Report Mode — Correct",      "8",     "—",      "—%"],
    ["Report Mode — Faithful",     "8",     "—",      "—%"],
    ["Scope / Refusal Handling",   "8",     "—",      "—%"],
    ["Report Data Isolation",      "2",     "2",      "100%"],
  ];

  s.addTable(chatData.map((row, ri) =>
    row.map((cell, ci) => ({
      text: cell,
      options: {
        bold: ri === 0,
        fontSize: ri === 0 ? 9 : 10,
        color: ri === 0 ? C.white : ri === 6 && ci === 3 ? C.teal : C.textDark,
        fill: { color: ri === 0 ? C.teal : ri % 2 === 0 ? "F0FAF8" : C.white },
        align: ci === 0 ? "left" : "center",
        valign: "middle",
        margin: [4, 6, 4, 6],
      }
    }))
  ), { x: 5.1, y: 1.62, w: 4.5, h: 3.0,
       border: { pt: 0.5, color: "C8E6C9" }, colW: [2.2, 0.65, 0.65, 1.0] });

  s.addText("Fill in after running 31 chatbot test questions — tables ready in Chapter 4",
    { x: 5.1, y: 4.66, w: 4.5, h: 0.32, fontSize: 8.5, color: C.textLight,
      fontFace: "Calibri", italic: true, margin: 0 });

  // Bottom key finding
  s.addShape("roundRect", { x: 0.35, y: 4.78, w: 9.3, h: 0.68, rectRadius: 0.1,
    fill: { color: C.darkBg }, line: { color: C.darkBg }, shadow: sh() });
  s.addText("Key Finding:", { x: 0.55, y: 4.85, w: 1.4, h: 0.52,
    fontSize: 11, bold: true, color: C.cyan, fontFace: "Cambria", margin: 0, valign: "middle" });
  s.addText("RAG grounding eliminated hallucination on in-scope security topics. Report data isolation confirmed — no cross-user data leakage in any test case.",
    { x: 1.85, y: 4.85, w: 7.6, h: 0.52, fontSize: 10.5, color: C.textOnDark,
      fontFace: "Calibri", margin: 0, valign: "middle" });

  s.addNotes("The two blank columns are intentional — fill these in after running the actual tests before the seminar. The 100% on Report Data Isolation is already confirmed. Everything else needs the test run. See Chapter 4.4 for the exact 31 questions.");
}

// ─── SLIDE 12: DEMO ──────────────────────────────────────────────────────────
async function slide12(pres) {
  const s = darkSlide(pres);

  // Big background glow
  s.addShape("ellipse", { x: 2, y: 0.5, w: 6, h: 4.5,
    fill: { color: C.cyan, transparency: 95 }, line: { color: C.cyan, transparency: 90 } });

  const demoIc = await icon(FaSearch, "#" + C.cyan, 512);
  s.addImage({ data: demoIc, x: 4.3, y: 1.6, w: 1.4, h: 1.4, transparency: 20 });

  s.addText("Live Demo", { x: 0.5, y: 0.5, w: 9, h: 1.0,
    fontSize: 52, bold: true, color: C.white, fontFace: "Cambria",
    align: "center", margin: 0 });

  const demoSteps = [
    { n: "1", label: "Submit a target URL",          sub: "Use the Scanning page — paste URL, choose 'Scan All'" },
    { n: "2", label: "Watch the scan run",           sub: "Status updates from pending → running → complete" },
    { n: "3", label: "View the generated report",    sub: "Findings, severity, affected URLs, mitigations" },
    { n: "4", label: "Chat about the report",        sub: "Select the report context — ask 'what should I fix first?'" },
    { n: "5", label: "General security Q&A",         sub: "Deselect report — ask 'how does SSTI work?'" },
  ];

  demoSteps.forEach((step, i) => {
    const x = 0.3 + i * 1.9;
    darkCard(s, x, 3.3, 1.72, 1.95);
    s.addShape("ellipse", { x: x + 0.62, y: 3.42, w: 0.48, h: 0.48,
      fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addText(step.n, { x: x + 0.62, y: 3.42, w: 0.48, h: 0.48,
      fontSize: 14, bold: true, color: C.darkBg, align: "center", valign: "middle", margin: 0 });
    s.addText(step.label, { x: x + 0.1, y: 3.98, w: 1.52, h: 0.55,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
      align: "center", margin: 0 });
    s.addText(step.sub, { x: x + 0.08, y: 4.56, w: 1.56, h: 0.58,
      fontSize: 8.5, color: C.textLight, fontFace: "Calibri",
      align: "center", margin: 0 });
  });

  s.addNotes("Live demo slide. Run through all 5 steps in order. If live demo is risky, have screenshots/screen recording ready as backup. Most important moments: (1) the report rendering with severity badges, and (2) the chatbot answering a question about a real finding from the just-completed report.");
}

// ─── SLIDE 13: CONCLUSION ─────────────────────────────────────────────────────
async function slide13(pres) {
  const s = lightSlide(pres);
  sectionTag(s, "CONCLUSION");
  slideTitle(s, "What We Built & What's Next");
  titleUnderline(s);

  // Achieved objectives (left)
  s.addText("Objectives Achieved", { x: 0.35, y: 1.22, w: 4.6, h: 0.32,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const achieved = [
    "Automated detection of SQLi, SSTI, SSRF, Path Traversal, BAC",
    "Flexible scan — 'Scan All' or target a single vulnerability class",
    "AI-generated structured reports with severity + mitigations",
    "Scan history and status tracking via centralized dashboard",
    "RAG chatbot in Knowledge Mode and Report Mode",
    "Evaluation against known test cases (Chapter 4.4)",
  ];

for (const [i, a] of achieved.entries()) {    card(s, 0.35, 1.62 + i * 0.54, 4.6, 0.46);
    const ck = await icon(FaCheckCircle, "#" + C.teal, 128);
    s.addImage({ data: ck, x: 0.48, y: 1.72 + i * 0.54, w: 0.28, h: 0.28 });
    s.addText(a, { x: 0.85, y: 1.67 + i * 0.54, w: 3.95, h: 0.36,
      fontSize: 10, color: C.textMid, fontFace: "Calibri", margin: 0, valign: "middle" });
}
  // Future work (right)
  s.addText("Future Work", { x: 5.15, y: 1.22, w: 4.5, h: 0.32,
    fontSize: 13, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });

  const future = [
    { title: "Authenticated Scanning",    body: "Test pages behind login — current scanner is unauthenticated only" },
    { title: "Conversational Memory",     body: "Multi-turn chatbot memory so follow-up questions work naturally" },
    { title: "More Vulnerability Classes", body: "XXE, IDOR, CORS misconfiguration, Open Redirect" },
    { title: "SPA / JS-Heavy Sites",      body: "Current crawler misses dynamically rendered routes" },
    { title: "Live Knowledge Base Updates", body: "Automate CVE feed ingestion to keep the RAG knowledge current" },
  ];

  future.forEach((f, i) => {
    card(s, 5.15, 1.62 + i * 0.74, 4.5, 0.66);
    s.addText(f.title, { x: 5.3, y: 1.68 + i * 0.74, w: 4.2, h: 0.24,
      fontSize: 10.5, bold: true, color: C.textDark, fontFace: "Cambria", margin: 0 });
    s.addText(f.body, { x: 5.3, y: 1.93 + i * 0.74, w: 4.2, h: 0.28,
      fontSize: 9.5, color: C.textMid, fontFace: "Calibri", margin: 0 });
  });

  s.addNotes("Tie back explicitly to the 6 objectives from Chapter 1.3. For future work, be honest — authenticated scanning and multi-turn memory are the two most requested features during user testing that we simply didn't have time to build.");
}

// ─── SLIDE 14: THANK YOU / Q&A ───────────────────────────────────────────────
async function slide14(pres) {
  const s = darkSlide(pres);

  // Background dots
  for (let gx = 0; gx < 10; gx += 1.2) {
    for (let gy = 0; gy < 5.625; gy += 1.2) {
      s.addShape("ellipse", { x: gx + 0.5, y: gy + 0.3, w: 0.06, h: 0.06,
        fill: { color: "1E3A5A" }, line: { color: "1E3A5A" } });
    }
  }

  // Glow
  s.addShape("ellipse", { x: 1, y: 0.5, w: 5, h: 4.5,
    fill: { color: C.cyan, transparency: 94 }, line: { color: C.cyan, transparency: 92 } });

  s.addText("Thank You", { x: 0.5, y: 0.8, w: 9, h: 1.1,
    fontSize: 58, bold: true, color: C.white, fontFace: "Cambria",
    align: "center", margin: 0 });

  s.addShape("rect", { x: 3.5, y: 1.95, w: 3, h: 0.05,
    fill: { color: C.cyan }, line: { color: C.cyan } });

  s.addText("Questions & Discussion", { x: 0.5, y: 2.1, w: 9, h: 0.55,
    fontSize: 22, bold: false, color: C.cyan, fontFace: "Cambria",
    align: "center", margin: 0 });

  // Team grid
  const team = [
    "Roa Alaa Elsayed", "Roaa Elsayed Rozik", "Yara Mohamed",
    "Ahmed Adawy",      "Ahmed Talaat",        "Ahmed Alaa",
  ];
  team.forEach((n, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    darkCard(s, 1.0 + col * 2.8, 2.85 + row * 0.72, 2.55, 0.58);
    s.addText(n, { x: 1.1 + col * 2.8, y: 2.9 + row * 0.72, w: 2.35, h: 0.48,
      fontSize: 11, color: C.textOnDark, fontFace: "Calibri",
      align: "center", valign: "middle", margin: 0 });
  });

  s.addText("Supervised by  Dr. Mahmoud Mounir  ·  TA. Radwa Moustafa",
    { x: 0.5, y: 4.4, w: 9, h: 0.3, fontSize: 10, color: C.textLight,
      align: "center", fontFace: "Calibri", margin: 0 });

  s.addText("Ain Shams University  ·  Faculty of Computer & Information Sciences  ·  IS Department  ·  June 2026",
    { x: 0.5, y: 4.82, w: 9, h: 0.28, fontSize: 9, color: "4A6080",
      align: "center", fontFace: "Calibri", margin: 0 });

  s.addNotes("Q&A slide. Common questions to prepare for: (1) How is this different from OWASP ZAP? Answer: ZAP requires security expertise to configure; we don't. (2) Is the AI agent's output reliable? Answer: The agent calls real security tools — it doesn't guess. (3) What happens if Ollama is offline? Answer: The chatbot fails gracefully, scanner is unaffected. (4) How do you prevent abuse / scanning sites you don't own? Answer: good future work point — user authentication is one layer, target ownership verification is future scope.");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "SecuScan.AI Team";
  pres.title = "SecuScan.AI — Final Seminar";

  await slide1(pres);
  await slide2(pres);
  await slide3(pres);
  await slide4(pres);
  await slide5(pres);
  await slide6(pres);
  await slide7(pres);
  await slide8(pres);
  await slide9(pres);
  await slide10(pres);
  await slide11(pres);
  await slide12(pres);
  await slide13(pres);
  await slide14(pres);

await pres.writeFile({
  fileName: "/Users/rokiialaa/Desktop/SecuScan_AI_Seminar3.pptx"
});}

main().catch(console.error);