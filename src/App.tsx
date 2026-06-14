import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Areti, your AI agent. I can help you with code, explain concepts, search for information, and much more. What would you like to do?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Could not connect to server. Make sure the server is running (npm run server)." }]);
    } finally {
      setIsTyping(false);
    }
  }

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

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">A</div>
          <span className="logo-text">Areti</span>
          <span className="header-badge">AI Agent</span>
        </div>
        <div className="header-right">
          <span className="header-status">
            <span className="status-dot" />
            Online
          </span>
        </div>
      </header>

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
            placeholder="Ask Areti anything..."
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
