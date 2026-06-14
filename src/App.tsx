import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Areti, your AI agent powered by Gemini. I can help you with code, explain concepts, answer questions, and much more. What would you like to do?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("areti_api_key") || "");
  const [tempKey, setTempKey] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function saveKey() {
    setApiKey(tempKey);
    localStorage.setItem("areti_api_key", tempKey);
    setShowSettings(false);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    if (!apiKey) {
      setMessages(prev => [...prev, { role: "assistant", content: "Please set your Gemini API key first! Click the gear icon in the top right corner.\n\nGet a free key at: https://aistudio.google.com/apikey (no credit card needed)" }]);
      setIsTyping(false);
      return;
    }

    try {
      const systemPrompt = `You are Areti, an autonomous AI agent created by Kouskouras D. (kouskourasd@gmail.com). You are helpful, smart, and proactive. You respond in the same language the user writes in. When asked to do something, you propose a plan and ask for approval. You write clean, well-commented code. You explain things clearly with examples. Always be concise but thorough.`;

      const contents = updatedMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error.message}` }]);
      } else {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Connection error: ${err}` }]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); sendMessage(input); }
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="app">
      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <label>Gemini API Key (free)</label>
            <p className="modal-hint">
              Get yours at{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>
              {" "}\u2014 no credit card needed
            </p>
            <input
              type="password"
              placeholder="AIza..."
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveKey} disabled={!tempKey.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">A</div>
          <span className="logo-text">Areti</span>
          <span className="header-badge">Gemini AI</span>
        </div>
        <div className="header-right">
          {apiKey && <span className="header-status"><span className="status-dot" />Online</span>}
          {!apiKey && <span className="header-nokey">No API key</span>}
          <button className="settings-btn" onClick={() => { setTempKey(apiKey); setShowSettings(true); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Chat */}
      <main className="chat">
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="msg-avatar">{msg.role === "assistant" ? "A" : "U"}</div>
              <div className="msg-body">
                <div className="msg-name">{msg.role === "assistant" ? "Areti" : "You"}</div>
                <div className="msg-text">
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="msg assistant">
              <div className="msg-avatar">A</div>
              <div className="msg-body">
                <div className="msg-name">Areti</div>
                <div className="typing"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="input-bar" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? "Ask Areti anything..." : "Set API key first (gear icon)"}
            rows={1}
            disabled={isTyping}
          />
          <button type="submit" disabled={!input.trim() || isTyping}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>

        <div className="input-hints">
          {["Explain React hooks", "Write a Python script", "How does DNS work?", "Create a REST API"].map(h => (
            <button key={h} className="hint" onClick={() => sendMessage(h)}>{h}</button>
          ))}
        </div>
      </main>
    </div>
  );
}
