import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getPersonaPrompt, buildReactionPrompt, buildFeedbackPrompt } from "./personaPrompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from dist/
app.use(express.static(path.join(__dirname, "../dist")));

// Lazy-init Anthropic client
let anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// Lazy-init OpenAI client (for TTS)
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// OpenAI TTS voice mapping per persona
const PERSONA_VOICES: Record<string, string> = {
  "maria-chen": "nova",       // warm, professional female
  "james-wilson": "onyx",     // deep, authoritative male
  "aisha-johnson": "shimmer", // clear, confident female
  "carlos-reyes": "echo",     // warm, energetic male
  "patricia-omalley": "fable",// warm, gentle (British-tinged)
  "dev-patel": "alloy",       // neutral, direct male
};

// === API Routes ===

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    llmAvailable: !!process.env.ANTHROPIC_API_KEY,
    ttsAvailable: !!process.env.OPENAI_API_KEY,
  });
});

// Text-to-Speech via OpenAI
app.post("/api/tts", async (req, res) => {
  const client = getOpenAI();
  if (!client) {
    return res.status(503).json({ error: "TTS not configured. Set OPENAI_API_KEY." });
  }

  const { text, personaId, speed } = req.body;
  if (!text) {
    return res.status(400).json({ error: "text required" });
  }

  try {
    const voice = (PERSONA_VOICES[personaId] || "alloy") as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

    const response = await client.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      speed: speed || 1.0,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    });
    res.send(buffer);
  } catch (error: any) {
    console.error("TTS error:", error.message);
    res.status(500).json({ error: "Failed to generate speech", detail: error.message });
  }
});

// Real-time reaction for a single persona
app.post("/api/react", async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: "LLM not configured. Set ANTHROPIC_API_KEY." });
  }

  const { personaId, userText, sessionType, messageHistory } = req.body;
  if (!personaId || !userText) {
    return res.status(400).json({ error: "personaId and userText required" });
  }

  try {
    const persona = getPersonaPrompt(personaId);
    const prompt = buildReactionPrompt(persona, userText, sessionType || "business-pitch", messageHistory || []);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: persona.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    res.json(parsed);
  } catch (error: any) {
    console.error("Reaction error:", error.message);
    res.status(500).json({ error: "Failed to generate reaction", detail: error.message });
  }
});

// Batch reactions for all personas at once
app.post("/api/react-batch", async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: "LLM not configured. Set ANTHROPIC_API_KEY." });
  }

  const { personaIds, userText, sessionType, messageHistory } = req.body;
  if (!personaIds?.length || !userText) {
    return res.status(400).json({ error: "personaIds and userText required" });
  }

  try {
    // Fire all persona reactions in parallel
    const results = await Promise.allSettled(
      personaIds.map(async (personaId: string) => {
        const persona = getPersonaPrompt(personaId);
        const prompt = buildReactionPrompt(persona, userText, sessionType || "business-pitch", messageHistory || []);

        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: persona.systemPrompt,
          messages: [{ role: "user", content: prompt }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return { personaId, ...JSON.parse(jsonStr) };
      })
    );

    const reactions = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r, i) => ({ personaId: personaIds[i], error: r.reason?.message }));

    res.json({ reactions, errors });
  } catch (error: any) {
    console.error("Batch reaction error:", error.message);
    res.status(500).json({ error: "Failed to generate reactions" });
  }
});

// Post-session feedback for a single persona
app.post("/api/feedback", async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: "LLM not configured. Set ANTHROPIC_API_KEY." });
  }

  const { personaId, transcript, sessionType } = req.body;
  if (!personaId || !transcript) {
    return res.status(400).json({ error: "personaId and transcript required" });
  }

  try {
    const persona = getPersonaPrompt(personaId);
    const prompt = buildFeedbackPrompt(persona, transcript, sessionType || "business-pitch");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: persona.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    res.json({ personaId, personaName: personaId, ...parsed });
  } catch (error: any) {
    console.error("Feedback error:", error.message);
    res.status(500).json({ error: "Failed to generate feedback", detail: error.message });
  }
});

// Batch feedback for all personas
app.post("/api/feedback-batch", async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: "LLM not configured. Set ANTHROPIC_API_KEY." });
  }

  const { personaIds, transcript, sessionType } = req.body;
  if (!personaIds?.length || !transcript) {
    return res.status(400).json({ error: "personaIds and transcript required" });
  }

  try {
    // Process sequentially to avoid rate limits with 6 Sonnet calls
    const feedback: any[] = [];

    for (const personaId of personaIds) {
      try {
        const persona = getPersonaPrompt(personaId);
        const prompt = buildFeedbackPrompt(persona, transcript, sessionType || "business-pitch");

        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: persona.systemPrompt,
          messages: [{ role: "user", content: prompt }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        feedback.push({ personaId, ...parsed });
        console.log(`Feedback generated for ${personaId}: score ${parsed.overallScore}`);
      } catch (err: any) {
        console.error(`Feedback failed for ${personaId}:`, err.message);
        // Continue with other personas
      }
    }

    res.json({ feedback });
  } catch (error: any) {
    console.error("Batch feedback error:", error.message);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
});

// SPA fallback — serve index.html for all non-API routes
app.use((_req: any, res: any) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LLM available: ${!!process.env.ANTHROPIC_API_KEY}`);
});
