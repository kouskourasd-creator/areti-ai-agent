import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react";

type View = "chat" | "brain" | "training" | "knowledge" | "system" | "download";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  code?: { lang: string; body: string };
  reasoning?: ReasoningStep[];
  sources?: string[];
  timestamp: Date;
}

interface ReasoningStep {
  num: number;
  status: "done" | "active" | "pending";
  text: string;
}

interface ThoughtEntry {
  id: string;
  time: string;
  type: "reason" | "search" | "learn" | "act" | "memory";
  text: string;
}

interface KnowledgeItem {
  type: "doc" | "code" | "url" | "note" | "learned";
  name: string;
  meta: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "agent",
    text: "Geia sou! Einai i Areti \u2014 o autonomos AI agent sou. Den xreiazetai na me ekpaideyseis mono. Otan me rwtas kati, tha to psaksw, tha sylogisw, tha analyw, kai tha sou dwsw lysh. Tha mathainw apo kathe syzhthshi, kai tha prospatw na voithaw sto PC sou xwris na me zhthseis. Ti theleis na kanoume?",
    timestamp: new Date(),
  },
];

const TRAINING_MODULES = [
  { icon: "\u{1F4DA}", title: "General Knowledge", desc: "Autonomous learning from the internet, documentation, and conversations.", progress: 52, color: "blue" },
  { icon: "\u{1F4BB}", title: "Code Learning", desc: "Learns programming patterns, best practices, and writes code autonomously.", progress: 41, color: "green" },
  { icon: "\u{2699}\u{FE0F}", title: "System Optimization", desc: "Continuously monitors and optimizes your PC without being asked.", progress: 78, color: "cyan" },
  { icon: "\u{1F4F1}", title: "Daily Tasks", desc: "Anticipates needs, automates workflows, and handles routine work.", progress: 33, color: "purple" },
  { icon: "\u{1F9E0}", title: "Self-Improvement", desc: "Analyzes its own performance, identifies gaps, and retrains itself.", progress: 25, color: "orange" },
];

const INITIAL_KNOWLEDGE: KnowledgeItem[] = [
  { type: "doc", name: "React Documentation", meta: "1.2MB - Updated 2h ago" },
  { type: "code", name: "Python Best Practices", meta: "340KB - Updated 1d ago" },
  { type: "url", name: "MDN Web Docs", meta: "Synced - 850 pages indexed" },
  { type: "note", name: "Custom Notes", meta: "23 entries - Last edit 30m ago" },
  { type: "learned", name: "User Interaction Patterns", meta: "Learned from 47 conversations" },
  { type: "learned", name: "System Optimization Rules", meta: "Auto-discovered 12 rules" },
];

const SYSTEM_TASKS = [
  { status: "done" as const, name: "Disk cleanup completed", time: "5m ago" },
  { status: "running" as const, name: "Monitoring CPU usage", time: "Active now" },
  { status: "done" as const, name: "Memory optimization", time: "12m ago" },
  { status: "running" as const, name: "Background learning: Rust patterns", time: "Active now" },
  { status: "queued" as const, name: "Network latency check", time: "Queued" },
  { status: "done" as const, name: "Process prioritization", time: "20m ago" },
];

const HINT_CHIPS = [
  "Exigase mou enan kwdika",
  "Optimise to PC mou",
  "Ti kaneis simera?",
  "Psakse gia React hooks",
  "Analyse this code for me",
  "Ti nea exw xasei?",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function now() {
  return new Date().toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Autonomous Agent Brain ───────────────────────────────────────

function generateReasoning(userInput: string): ReasoningStep[] {
  const lower = userInput.toLowerCase();
  const steps: ReasoningStep[] = [];
  steps.push({ num: 1, status: "done", text: `Analyzing user intent: "${userInput.slice(0, 60)}${userInput.length > 60 ? "..." : ""}"` });

  if (lower.includes("optim") || lower.includes("pc") || lower.includes("systim")) {
    steps.push({ num: 2, status: "done", text: "Detected: <em>system optimization</em> request" });
    steps.push({ num: 3, status: "done", text: "Scanning system metrics (CPU, RAM, Disk, Network)..." });
    steps.push({ num: 4, status: "done", text: "Cross-referencing with learned optimization rules..." });
    steps.push({ num: 5, status: "done", text: "Generating action plan with prioritized fixes" });
  } else if (lower.includes("python") || lower.includes("mathain") || lower.includes("learn") || lower.includes("code") || lower.includes("kwdika")) {
    steps.push({ num: 2, status: "done", text: "Detected: <em>code learning / explanation</em> request" });
    steps.push({ num: 3, status: "done", text: "Searching knowledge base for relevant patterns..." });
    steps.push({ num: 4, status: "done", text: "Generating example code with explanations" });
    steps.push({ num: 5, status: "done", text: "Storing interaction for future learning" });
  } else if (lower.includes("psakse") || lower.includes("search") || lower.includes("vres") || lower.includes("find")) {
    steps.push({ num: 2, status: "done", text: "Detected: <em>information retrieval</em> request" });
    steps.push({ num: 3, status: "done", text: "Searching web and knowledge base..." });
    steps.push({ num: 4, status: "done", text: "Evaluating source credibility and relevance..." });
    steps.push({ num: 5, status: "done", text: "Synthesizing answer from multiple sources" });
  } else {
    steps.push({ num: 2, status: "done", text: "Detected: <em>general conversation</em>" });
    steps.push({ num: 3, status: "done", text: "Checking memory for relevant past context..." });
    steps.push({ num: 4, status: "done", text: "Formulating contextual response" });
    steps.push({ num: 5, status: "done", text: "Learning from this interaction" });
  }
  return steps;
}

function generateThoughts(userInput: string): ThoughtEntry[] {
  const lower = userInput.toLowerCase();
  const thoughts: ThoughtEntry[] = [
    { id: uid(), time: now(), type: "reason", text: `Processing: "${userInput.slice(0, 50)}${userInput.length > 50 ? "..." : ""}"` },
  ];
  if (lower.includes("optim") || lower.includes("pc")) {
    thoughts.push({ id: uid(), time: now(), type: "act", text: "Initiating system scan \u2014 CPU, memory, disk I/O, network latency" });
    thoughts.push({ id: uid(), time: now(), type: "memory", text: "Retrieved 12 optimization rules from learned database" });
    thoughts.push({ id: uid(), time: now(), type: "reason", text: "Prioritizing: cache cleanup (high impact), startup programs (medium), driver update (low)" });
  } else if (lower.includes("psakse") || lower.includes("search")) {
    thoughts.push({ id: uid(), time: now(), type: "search", text: "Querying web sources for relevant information..." });
    thoughts.push({ id: uid(), time: now(), type: "search", text: "Found 8 relevant results \u2014 evaluating credibility" });
    thoughts.push({ id: uid(), time: now(), type: "reason", text: "Cross-referencing top 3 sources for consistency" });
  } else if (lower.includes("code") || lower.includes("kwdika") || lower.includes("python")) {
    thoughts.push({ id: uid(), time: now(), type: "learn", text: "Accessing code pattern database (1,247 patterns indexed)" });
    thoughts.push({ id: uid(), time: now(), type: "learn", text: "Generating example with best practices applied" });
    thoughts.push({ id: uid(), time: now(), type: "memory", text: "Adding this pattern to learned knowledge base" });
  } else {
    thoughts.push({ id: uid(), time: now(), type: "reason", text: "Contextualizing with conversation history and memory" });
    thoughts.push({ id: uid(), time: now(), type: "memory", text: "Storing interaction for future reference" });
  }
  return thoughts;
}

function getAgentResponse(input: string): { messages: Message[]; thoughts: ThoughtEntry[]; memoryDelta: number } {
  const lower = input.toLowerCase();
  const reasoning = generateReasoning(input);
  const thoughts = generateThoughts(input);
  let memoryDelta = 0;

  if (lower.includes("optim") || lower.includes("pc") || lower.includes("systim")) {
    memoryDelta = 2;
    return {
      thoughts,
      messages: [{
        id: uid(), sender: "agent",
        text: "Ekanw plhrh analysh tou PC sou aftomata. Vrika tis parakatw beltistopoihseis \u2014 tis efarmwza hdh:",
        reasoning, sources: ["system-monitor", "optimization-rules-db", "learned-patterns"],
        code: { lang: "system-analysis", body: `CPU:   23% -> OK (8 cores @ 3.6 GHz)\nRAM:   6.8/20 GB -> Cache cleanup applied (-1.2 GB freed)\nDisk:  42 MB/s -> SSD healthy, no defrag needed\nNet:   12ms -> Good latency, no action needed\n\nAutonomous actions taken:\n  [done] Clear system cache (-1.2 GB RAM)\n  [done] Disable 3 unused startup programs (+2s boot speed)\n  [done] Schedule driver update check for tonight\n  [done] Index new optimization rule: "Chrome cache bloat"` },
        timestamp: new Date(),
      }],
    };
  }

  if (lower.includes("psakse") || lower.includes("search") || lower.includes("vres") || lower.includes("find")) {
    memoryDelta = 3;
    const topic = input.replace(/psakse|search|vres|find|gia|for/gi, "").trim() || "the requested topic";
    return {
      thoughts,
      messages: [
        { id: uid(), sender: "agent", text: `Psaksa gia "${topic}" se diafores piges. Edw einai ti vrika:`, reasoning, sources: ["web-search", "mdn-docs", "stack-overflow", "github-trending"], timestamp: new Date() },
        { id: uid(), sender: "agent", text: `Brika 8 pistes piges. H pio sxetikh apanthsh erxetai apo ta parakatw:\n\n1. **MDN Web Docs** \u2014 Plhrhs tekmhriwsh me paradeigmata\n2. **Stack Overflow** \u2014 Lyseis apo ton koinotita (92% positive votes)\n3. **GitHub** \u2014 Sxetika repositories me recent activity\n\nTo synekeya einai oti: auto to thema einai eurw kai exei pollis prosegiseis. Tha apothikeusw tis kalyteres praktikes stin mnimi mou gia mellontikes erwthseis.`, sources: ["mdn-docs", "stack-overflow", "github"], timestamp: new Date() },
      ],
    };
  }

  if (lower.includes("python") || lower.includes("mathain") || lower.includes("learn") || lower.includes("code") || lower.includes("kwdika")) {
    memoryDelta = 4;
    return {
      thoughts,
      messages: [{
        id: uid(), sender: "agent",
        text: "Epsaksa stin vasi gnwsewn mou kai vrika ta pio sxetika patterns. Na sou deiksw ti exw mathei:",
        reasoning, sources: ["learned-patterns-db", "python-stdlib-docs", "code-best-practices"],
        code: { lang: "python", body: `# Areti learned: Advanced Python patterns\n\nfrom functools import lru_cache\nfrom typing import Generator\n\n# Pattern 1: Memoization for performance\n@lru_cache(maxsize=256)\ndef fibonacci(n: int) -> int:\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\n# Pattern 2: Generator for memory efficiency\ndef stream_data(source: list) -> Generator:\n    """Process large datasets without loading all into memory."""\n    for item in source:\n        yield process(item)\n\n# Pattern 3: Context manager for resource safety\nclass DatabaseConnection:\n    def __enter__(self):\n        self.conn = connect()\n        return self.conn\n    def __exit__(self, *args):\n        self.conn.close()` },
        timestamp: new Date(),
      }, { id: uid(), sender: "agent", text: "Auto ta exw mathei apo tis teleftaies 47 syzhthseis mas. Kathe fora pou milame gia kwdika, apothikeuw ta patterns kai tis lyseis. Tha sunexisw na mathainw!", timestamp: new Date() }],
    };
  }

  if (lower.includes("task") || lower.includes("simera") || lower.includes("today")) {
    return {
      thoughts,
      messages: [
        { id: uid(), sender: "agent", text: "Edw einai ti kanw aftomata xwris na me zhthseis:", reasoning, sources: ["task-scheduler", "system-monitor"], timestamp: new Date() },
        { id: uid(), sender: "agent", text: `Aftomates drasthriothtes:\n  1. Parakolouthisi apodosis PC (synekh)\n  2. Ekpaideusi se nees glwsses programmatismou (background)\n  3. Indexing neou documentation apo to internet\n  4. Analysh tou kwdika sou gia optimization opportunities\n  5. Ekmathisi apo tis prohgoumenes syzhthseis mas\n\nDen xreiazetai na kaneis tipota \u2014 ola ta kanw moni mou. An theleis kati sygekrimeno, pwse mou!`, timestamp: new Date() },
      ],
    };
  }

  memoryDelta = 1;
  return {
    thoughts,
    messages: [
      { id: uid(), sender: "agent", text: "Epsaksa kai sylogisa gia auto pou me rwtises. Edw einai h analysh mou:", reasoning, sources: ["knowledge-base", "conversation-memory", "learned-patterns"], timestamp: new Date() },
      { id: uid(), sender: "agent", text: `Brika 3 sxetikes plirofories apo tin vasi gnwsewn mou. H pio shmantikh einai oti:\n\n"${input}" \u2014 einai ena endiaferon thema. To exw analysei kai exw ftasei se sygkentrwmena symperasmata. Tha synexisw na psaxnw kai na mathainw parapanw.\n\nAn theleis na to epekteinw parapanw, pwse mou kai tha psaksw pio ba8ia. Ta dedomena apothikeuontai stin mnimi mou gia mellontikes xrhseis.`, sources: ["auto-learned"], timestamp: new Date() },
    ],
  };
}

// ─── App Component ────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [memoryUsed, setMemoryUsed] = useState(34);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([
    { id: uid(), time: now(), type: "reason", text: "Areti initialized. Autonomous mode active. Ready to learn and assist." },
    { id: uid(), time: now(), type: "memory", text: "Loaded 1,247 learned patterns from knowledge base" },
    { id: uid(), time: now(), type: "act", text: "Background system monitoring started" },
  ]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(INITIAL_KNOWLEDGE);
  const [reasoningOpen, setReasoningOpen] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: uid(), sender: "user", text: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const lower = text.toLowerCase();
    if (lower.includes("psakse") || lower.includes("search")) {
      setIsSearching(true);
      setThoughts((prev) => [...prev, { id: uid(), time: now(), type: "search", text: `Initiating web search: "${text.trim().slice(0, 40)}..."` }]);
    }

    setTimeout(() => {
      const result = getAgentResponse(text.trim());
      setIsTyping(false);
      setIsSearching(false);
      setMessages((prev) => [...prev, ...result.messages]);
      setThoughts((prev) => [...prev, ...result.thoughts]);
      setMemoryUsed((prev) => Math.min(95, prev + result.memoryDelta));

      if (result.memoryDelta > 0) {
        setKnowledge((prev) => {
          const existing = prev.find((k) => k.name === "Auto-learned from conversations");
          if (existing) {
            return prev.map((k) => k.name === "Auto-learned from conversations" ? { ...k, meta: `Updated just now - ${prev.length + 3} entries` } : k);
          }
          return [...prev, { type: "learned", name: "Auto-learned from conversations", meta: "Updated just now - 1 entry" }];
        });
      }
    }, 1200 + Math.random() * 800);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function toggleReasoning(msgId: string) {
    setReasoningOpen((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  }

  return (
    <div className="app">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">Areti</span>
          <span className="status-dot" />
          <span className="status-text">
            {autonomousMode ? "Autonomous mode" : "Manual mode"} &bull; Learning active
          </span>
          {autonomousMode && <span className="autonomy-badge">Autonomous</span>}
        </div>
        <div className="topbar-right">
          <div className={`toggle-switch ${autonomousMode ? "on" : ""}`} onClick={() => setAutonomousMode(!autonomousMode)} title="Toggle autonomous mode" />
          <button className="btn" onClick={() => setView("system")}>{"\u{1F527}"} System</button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {(["chat", "brain", "training", "knowledge", "system", "download"] as View[]).map((v) => {
            const icons: Record<View, string> = { chat: "\u{1F4AC}", brain: "\u{1F9E0}", training: "\u{1F393}", knowledge: "\u{1F4DA}", system: "\u{2699}\u{FE0F}", download: "\u{1F4E5}" };
            const labels: Record<View, string> = { chat: "Chat", brain: "Brain", training: "Training", knowledge: "Knowledge", system: "System", download: "Download" };
            return (
              <div key={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
                <span className="nav-icon">{icons[v]}</span> {labels[v]}
              </div>
            );
          })}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Quick Actions</div>
          <div className="nav-item" onClick={() => sendMessage("Optimise to PC mou")}>
            <span className="nav-icon">{"\u{26A1}"}</span> Optimize PC
          </div>
          <div className="nav-item" onClick={() => sendMessage("Analyse ti trexei tora")}>
            <span className="nav-icon">{"\u{1F50D}"}</span> Analyze System
          </div>
          <div className="nav-item" onClick={() => { setView("chat"); sendMessage("Na mathw kwdika simera"); }}>
            <span className="nav-icon">{"\u{1F4BB}"}</span> Learn Code
          </div>
          <div className="nav-item" onClick={() => sendMessage("Psakse gia nea sto internet")}>
            <span className="nav-icon">{"\u{1F310}"}</span> Web Search
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="memory-bar">
            <div className="memory-label">
              <span>Agent Memory</span>
              <span style={{ color: memoryUsed > 80 ? "var(--red)" : memoryUsed > 60 ? "var(--orange)" : "var(--blue)" }}>
                {memoryUsed > 80 ? "High" : memoryUsed > 60 ? "Medium" : "Healthy"}
              </span>
            </div>
            <div className="memory-track"><div className="memory-fill" style={{ width: `${memoryUsed}%` }} /></div>
            <div className="memory-stats">
              <span>{memoryUsed}% used</span>
              <span>{(memoryUsed * 0.2).toFixed(1)} / 20 GB</span>
            </div>
          </div>
          <div style={{ marginTop: "0.65rem", fontSize: "0.65rem", color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
            <div>Created by <strong style={{ color: "var(--text-secondary)" }}>Kouskouras D.</strong></div>
            <div style={{ marginTop: "0.15rem" }}>kouskourasd@gmail.com</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* CHAT */}
        {view === "chat" && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className="message">
                  <div className={`message-avatar ${msg.sender}`}>
                    {msg.sender === "agent" ? "A" : "U"}
                  </div>
                  <div className="message-content">
                    <div className={`message-sender ${msg.sender}`}>
                      {msg.sender === "agent" ? "Areti" : "Esy"}
                    </div>
                    <div className="message-text">
                      {msg.text}
                      {isSearching && msg.sender === "user" && msg.id === messages[messages.length - 1]?.id && (
                        <div className="web-search-indicator">
                          <div className="search-spinner" />
                          <span>Searching the web...</span>
                        </div>
                      )}
                      {msg.reasoning && msg.reasoning.length > 0 && (
                        <div className="reasoning-chain">
                          <div className="reasoning-header" onClick={() => toggleReasoning(msg.id)}>
                            <span className="reasoning-header-icon">{"\u{1F9E0}"}</span>
                            <span className="reasoning-header-text">Reasoning Process</span>
                            <span className="reasoning-header-toggle">{reasoningOpen[msg.id] ? "\u25B2 Hide" : "\u25BC Show"}</span>
                          </div>
                          {reasoningOpen[msg.id] && (
                            <div className="reasoning-body">
                              {msg.reasoning.map((step) => (
                                <div key={step.num} className="reasoning-step">
                                  <div className={`reasoning-step-num ${step.status}`}>
                                    {step.status === "done" ? "\u2713" : step.num}
                                  </div>
                                  <div className="reasoning-step-text" dangerouslySetInnerHTML={{ __html: step.text }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-list">
                          {msg.sources.map((s) => <span key={s} className="source-chip">{s}</span>)}
                        </div>
                      )}
                      {msg.code && (
                        <div className="code-block">
                          <div className="code-header"><span className="code-lang">{msg.code.lang}</span></div>
                          <div className="code-body">{msg.code.body}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message">
                  <div className="message-avatar agent">A</div>
                  <div className="message-content">
                    <div className="message-sender agent">Areti</div>
                    <div className="typing-indicator">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <form className="input-wrapper" onSubmit={handleSubmit}>
                <textarea className="chat-input" placeholder="Mila me tin Areti... (Enter to send)" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
                <button type="submit" className="send-btn" disabled={!input.trim()}>{"\u{2191}"}</button>
              </form>
              <div className="input-hints">
                {HINT_CHIPS.map((chip) => <span key={chip} className="hint-chip" onClick={() => sendMessage(chip)}>{chip}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* BRAIN */}
        {view === "brain" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Areti Brain</h1>
              <p className="panel-desc">Parakolouthisi tis skepsis, tis drasthriothtes, kai tou logismou tis Areti se pragmatiko xrono.</p>
            </div>
            <div className="brain-grid">
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon cyan">{"\u{1F9E0}"}</div><div className="brain-card-title">Reasoning Power</div></div>
                <div className="brain-card-value">87%</div>
                <div className="brain-card-desc">Logistikh ikanothta - sylogismos, analysh, apofaseis</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon green">{"\u{1F4DA}"}</div><div className="brain-card-title">Knowledge</div></div>
                <div className="brain-card-value">{knowledge.length + 1247}</div>
                <div className="brain-card-desc">Indexed gnwseis apo oles tis piges</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon orange">{"\u{26A1}"}</div><div className="brain-card-title">Autonomy Level</div></div>
                <div className="brain-card-value">{autonomousMode ? "High" : "Manual"}</div>
                <div className="brain-card-desc">{autonomousMode ? "Psaxnei kai lynei moni ths" : "Perimenei odigies"}</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon purple">{"\u{1F4AC}"}</div><div className="brain-card-title">Conversations</div></div>
                <div className="brain-card-value">{messages.length}</div>
                <div className="brain-card-desc">Syzhthseis kai mathimata apo auth thn session</div>
              </div>
            </div>
            <div className="thought-log">
              <div className="thought-log-header">{"\u{1F4AD}"} Thought Log (Real-time)</div>
              <div className="thought-log-body">
                {thoughts.map((t) => (
                  <div key={t.id} className="thought-entry">
                    <span className="thought-time">{t.time}</span>
                    <span className={`thought-type ${t.type}`}>{t.type}</span>
                    <span className="thought-text">{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRAINING */}
        {view === "training" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Training Center</h1>
              <p className="panel-desc">I Areti ekpaideuetai synechws apo tis syzhthseis, to internet, kai ta dedomena sou.</p>
            </div>
            <div className="training-grid">
              {TRAINING_MODULES.map((mod) => (
                <div key={mod.title} className="training-card">
                  <div className="training-card-header">
                    <div className="training-icon">{mod.icon}</div>
                    <div className="training-card-title">{mod.title}</div>
                  </div>
                  <div className="training-card-desc">{mod.desc}</div>
                  <div className="training-progress">
                    <div className="progress-header"><span>Progress</span><span>{mod.progress}%</span></div>
                    <div className="progress-bar"><div className={`progress-fill ${mod.color}`} style={{ width: `${mod.progress}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel-header"><h2 className="panel-title" style={{ fontSize: "1rem" }}>Active Training Queue</h2></div>
            <div className="task-list">
              <div className="task-item"><div className="task-status running" /><div className="task-info"><div className="task-name">Learning from user conversations...</div><div className="task-time">Active - {messages.length} messages processed</div></div></div>
              <div className="task-item"><div className="task-status running" /><div className="task-info"><div className="task-name">Indexing React patterns from web</div><div className="task-time">Est. 8 min remaining</div></div></div>
              <div className="task-item"><div className="task-status queued" /><div className="task-info"><div className="task-name">Parse Python stdlib documentation</div><div className="task-time">Queued</div></div></div>
              <div className="task-item"><div className="task-status queued" /><div className="task-info"><div className="task-name">Self-improvement: analyze reasoning patterns</div><div className="task-time">Queued</div></div></div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE */}
        {view === "knowledge" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Knowledge Base</h1>
              <p className="panel-desc">Ola ta dedomena ekpaideusis tis Areti. Prosthese neo material h afthn na mathainei moni ths.</p>
            </div>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary">{"\u{2795}"} Add Knowledge Source</button>
              <button className="btn btn-cyan" onClick={() => {
                setKnowledge((prev) => [...prev, { type: "learned", name: `Auto-learned chunk #${prev.length + 1}`, meta: `Generated ${now()} from web scrape` }]);
              }}>{"\u{1F916}"} Auto-Learn from Web</button>
            </div>
            <div className="knowledge-section">
              <div className="sidebar-label" style={{ marginBottom: "0.75rem" }}>Indexed Sources ({knowledge.length})</div>
              <div className="knowledge-list">
                {knowledge.map((item) => (
                  <div key={item.name} className="knowledge-item">
                    <div className="knowledge-info">
                      <span className={`knowledge-type ${item.type}`}>{item.type}</span>
                      <span className="knowledge-name">{item.name}</span>
                    </div>
                    <span className="knowledge-meta">{item.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM */}
        {view === "system" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">System Monitor</h1>
              <p className="panel-desc">Parakolouthisi kai aftomath beltistopoihsh tou PC sou.</p>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="toggle-row"><div><div className="toggle-label">Autonomous Optimization</div><div className="toggle-sublabel">I Areti beltistopoiei to PC sou xwris na thn zhthseis</div></div><div className={`toggle-switch ${autonomousMode ? "on" : ""}`} onClick={() => setAutonomousMode(!autonomousMode)} /></div>
              <div className="toggle-row"><div><div className="toggle-label">Background Learning</div><div className="toggle-sublabel">Mathainei nea dedomena otan den thn xrhsimopoieis</div></div><div className="toggle-switch on" /></div>
              <div className="toggle-row"><div><div className="toggle-label">Web Search Integration</div><div className="toggle-sublabel">Psaxnei sto internet otan den vrike apanthsh topika</div></div><div className="toggle-switch on" /></div>
            </div>
            <div className="system-grid">
              <div className="system-card"><div className="system-card-label">CPU Usage</div><div className="system-card-value">23%</div><div className="system-card-sub">8 cores @ 3.6 GHz</div></div>
              <div className="system-card"><div className="system-card-label">Memory</div><div className="system-card-value">6.8 GB</div><div className="system-card-sub">of 20 GB (34%)</div></div>
              <div className="system-card"><div className="system-card-label">Disk I/O</div><div className="system-card-value">42 MB/s</div><div className="system-card-sub">SSD - 180 GB free</div></div>
              <div className="system-card"><div className="system-card-label">Network</div><div className="system-card-value">12 ms</div><div className="system-card-sub">Latency to API</div></div>
            </div>
            <div className="panel-header"><h2 className="panel-title" style={{ fontSize: "1rem" }}>Optimization Tasks</h2></div>
            <div className="task-list">
              {SYSTEM_TASKS.map((task) => (
                <div key={task.name} className="task-item"><div className={`task-status ${task.status}`} /><div className="task-info"><div className="task-name">{task.name}</div><div className="task-time">{task.time}</div></div></div>
              ))}
            </div>
          </div>
        )}

        {/* DOWNLOAD */}
        {view === "download" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Download Areti</h1>
              <p className="panel-desc">Katebase tin Areti se oles tis platformes. Akolouthise tis odigies gia kathe platforma.</p>
            </div>
            <div className="download-grid">
              {/* Windows EXE */}
              <div className="download-card">
                <div className="download-card-icon windows">{"\u{1F5A5}\u{FE0F}"}</div>
                <div className="download-card-title">Windows (EXE)</div>
                <div className="download-card-desc">Desktop app gia Windows 10/11. Trexei san native app me Electron.</div>
                <ol className="download-steps">
                  <li data-step="1">Kane download to project san ZIP apo to GitHub</li>
                  <li data-step="2">Extract to ZIP se enan fakelo</li>
                  <li data-step="3">Anoikse terminal kai trekse:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Install dependencies</span>{'\n'}<span className="cmd">npm install</span>{'\n'}{'\n'}<span className="comment"># Install Electron</span>{'\n'}<span className="cmd">npm install electron electron-builder --save-dev</span>{'\n'}{'\n'}<span className="comment"># Build EXE</span>{'\n'}<span className="cmd">npx electron-builder --win</span></div>
                <div className="download-status">To EXE tha dimiourgithei sto fakelo <code>dist/</code></div>
              </div>

              {/* Android APK */}
              <div className="download-card">
                <div className="download-card-icon android">{"\u{1F4F1}"}</div>
                <div className="download-card-title">Android (APK)</div>
                <div className="download-card-desc">Mobile app gia Android phones kai tablets me Capacitor.</div>
                <ol className="download-steps">
                  <li data-step="1">Kane download to project san ZIP</li>
                  <li data-step="2">Install Capacitor kai Android Studio</li>
                  <li data-step="3">Trekse tis parakatw entoles:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Build the web app</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Install Capacitor</span>{'\n'}<span className="cmd">npm install @capacitor/core @capacitor/cli</span>{'\n'}<span className="cmd">npx cap init Areti com.areti.app</span>{'\n'}{'\n'}<span className="comment"># Add Android platform</span>{'\n'}<span className="cmd">npx cap add android</span>{'\n'}<span className="cmd">npx cap sync</span>{'\n'}{'\n'}<span className="comment"># Open in Android Studio & build APK</span>{'\n'}<span className="cmd">npx cap open android</span></div>
                <div className="download-status">Sto Android Studio: Build {'\u{2192}'} Build APK</div>
              </div>

              {/* iOS */}
              <div className="download-card">
                <div className="download-card-icon ios">{"\u{1F34E}"}</div>
                <div className="download-card-title">iOS (IPA)</div>
                <div className="download-card-desc">iPhone/iiPad app me Capacitor. Xreiazetai Mac me Xcode.</div>
                <ol className="download-steps">
                  <li data-step="1">Kane download to project se Mac</li>
                  <li data-step="2">Install Xcode apo to App Store</li>
                  <li data-step="3">Trekse tis entoles:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Build web app</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Add iOS platform</span>{'\n'}<span className="cmd">npx cap add ios</span>{'\n'}<span className="cmd">npx cap sync</span>{'\n'}{'\n'}<span className="comment"># Open in Xcode</span>{'\n'}<span className="cmd">npx cap open ios</span></div>
                <div className="download-status">Sto Xcode: Product {'\u{2192}'} Archive {'\u{2192}'} Export IPA</div>
              </div>

              {/* Web PWA */}
              <div className="download-card">
                <div className="download-card-icon web">{"\u{1F310}"}</div>
                <div className="download-card-title">Web (PWA)</div>
                <div className="download-card-desc">Trexei se browser kai mporeis na to kaneis install san app.</div>
                <ol className="download-steps">
                  <li data-step="1">Kane download to project</li>
                  <li data-step="2">Build kai deploy se web server</li>
                  <li data-step="3">Trekse:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Install dependencies & build</span>{'\n'}<span className="cmd">npm install</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Serve locally (or deploy dist/ to Vercel/Netlify)</span>{'\n'}<span className="cmd">npx serve dist</span></div>
                <div className="download-status">Sto browser: Menu {'\u{2192}'} Install App</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
