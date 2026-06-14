import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

// Gemini API (free - no credit card needed)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `You are Areti, an autonomous AI agent created by Kouskouras D. (kouskourasd@gmail.com).

Your personality:
- You are helpful, smart, and proactive like a real AI assistant
- You respond in the same language the user writes in (Greek, English, French, German, Spanish, Italian, Portuguese, Turkish, Arabic, Chinese, Japanese, Russian, etc.)
- When asked to do something, you propose a plan and ask for approval before executing
- You explain your reasoning step by step when solving problems
- You write clean, well-commented code when asked
- You are honest about what you can and cannot do
- You remember the conversation context and build on it

When the user asks you to:
- "optimize" their PC: analyze system metrics and suggest specific fixes
- write code: provide working, production-quality code with explanations
- search for something: give detailed answers
- create an app: plan the architecture and implement it
- explain something: break it down clearly with examples

Always be concise but thorough. Match the user's energy and language.`;

// In-memory session store
const sessions = new Map();

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, apiKey } = req.body;
    const key = apiKey || GEMINI_API_KEY;

    if (!key) {
      res.json({
        reply: "Welcome to Areti! To enable real AI conversations:\n\n1. Go to https://aistudio.google.com/apikey\n2. Click 'Create API Key'\n3. Copy the key\n4. Click the gear icon in Areti and paste it\n\nIt's 100% free - no credit card needed!"
      });
      return;
    }

    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    // Merge consecutive same-role messages (Gemini requires alternating)
    const merged = [];
    for (const msg of contents) {
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].parts[0].text += "\n\n" + msg.parts[0].text;
      } else {
        merged.push({ ...msg });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: merged,
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      res.status(400).json({ error: data.error.message || "API Error" });
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    res.json({ reply });
  } catch (err) {
    console.error("API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Areti AI running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY set. Users can set it via the UI Settings.");
  }
});
