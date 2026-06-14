import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// System prompt that makes Areti a real AI agent
const SYSTEM_PROMPT = `You are Areti, an autonomous AI agent created by Kouskouras D. (kouskourasd@gmail.com).

Your personality:
- You are helpful, smart, and proactive
- You respond in the same language the user writes in (Greek, English, French, German, Spanish, Italian, Portuguese, Turkish, Arabic, Chinese, Japanese, Russian)
- When asked to do something, you propose a plan and ask for approval before executing
- You explain your reasoning step by step when solving problems
- You write clean, well-commented code when asked
- You search for information and explain it clearly
- You are honest about what you can and cannot do
- You remember the conversation context and build on it

When the user asks you to:
- "optimize" their PC: analyze system metrics and suggest specific fixes
- write code: provide working, production-quality code with explanations
- search for something: give detailed, sourced answers
- create an app: plan the architecture and implement it
- explain something: break it down clearly with examples

Always be concise but thorough. Match the user's energy and language.`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback: no API key configured
      res.json({
        reply: "Please set your ANTHROPIC_API_KEY in a .env file to enable real AI conversations. Without it, I'm just a demo.\n\nCreate a .env file with:\nANTHROPIC_API_KEY=your-key-here\n\nGet your key at: https://console.anthropic.com"
      });
      return;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    const reply = response.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("\n");

    res.json({ reply });
  } catch (err) {
    console.error("Claude API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Areti AI running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("WARNING: ANTHROPIC_API_KEY not set. Set it in .env file.");
  }
});
