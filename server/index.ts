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
app.use(express.static(path.join(__dirname, "../dist")));

// === Provider Init ===

let anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

// === Voice Mappings ===

const OPENAI_VOICES: Record<string, string> = {
  "maria-chen": "nova",
  "james-wilson": "onyx",
  "aisha-johnson": "shimmer",
  "carlos-reyes": "echo",
  "patricia-omalley": "fable",
  "dev-patel": "alloy",
};

const ELEVENLABS_VOICES: Record<string, string> = {
  "maria-chen": "21m00Tcm4TlvDq8ikWAM",      // Rachel
  "james-wilson": "fATgBRI8wg5KkDFg8vBd",     // Custom voice
  "aisha-johnson": "EXAVITQu4vr4xnSDxMaL",   // Bella
  "carlos-reyes": "ErXwobaYiN019PkySvjV",     // Antoni
  "patricia-omalley": "MF3mGyEYCl7XYWbV9V6O", // Elli
  "dev-patel": "TxGEqnHWrfWFTfGW9XjX",       // Josh
};

// === Health Check ===

app.get("/api/health", (_req, res) => {
  const ttsProviders: string[] = [];
  if (process.env.OPENAI_API_KEY) ttsProviders.push("openai");
  if (process.env.ELEVENLABS_API_KEY) ttsProviders.push("elevenlabs");

  res.json({
    status: "ok",
    llmAvailable: !!process.env.ANTHROPIC_API_KEY,
    ttsAvailable: ttsProviders.length > 0,
    ttsProviders,
  });
});

// ElevenLabs diagnostic — test the key
app.get("/api/tts/test-elevenlabs", async (_req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.json({ status: "no key", keyLength: 0 });

  try {
    const keyPreview = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);

    // Test the key by calling the user endpoint
    const userRes = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
    });
    const userData = userRes.ok ? await userRes.json() : await userRes.text();

    res.json({
      status: userRes.ok ? "ok" : "error",
      httpCode: userRes.status,
      keyPreview,
      keyLength: apiKey.length,
      response: userRes.ok ? { subscription: userData.subscription?.tier } : userData,
    });
  } catch (err: any) {
    res.json({ status: "error", message: err.message });
  }
});

// === TTS Endpoint (multi-provider) ===

app.post("/api/tts", async (req, res) => {
  const { text, personaId, speed, provider } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  const requested = provider || "auto";

  // ElevenLabs (premium) — preferred when explicitly requested or auto with key
  if ((requested === "elevenlabs" || requested === "auto") && process.env.ELEVENLABS_API_KEY) {
    return ttsElevenLabs(text, personaId, res);
  }

  // OpenAI — standard
  if ((requested === "openai" || requested === "auto") && process.env.OPENAI_API_KEY) {
    return ttsOpenAI(text, personaId, speed, res);
  }

  return res.status(503).json({ error: "No TTS provider configured." });
});

async function ttsOpenAI(text: string, personaId: string, speed: number, res: any) {
  const client = getOpenAI();
  if (!client) return res.status(503).json({ error: "OpenAI not configured" });

  try {
    const voice = (OPENAI_VOICES[personaId] || "alloy") as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    console.log(`[TTS:OpenAI] voice="${voice}" persona="${personaId}"`);

    const response = await client.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      speed: speed || 1.0,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": buffer.length.toString(), "Cache-Control": "public, max-age=3600" });
    res.send(buffer);
  } catch (error: any) {
    console.error("[TTS:OpenAI] Error:", error.message);
    res.status(500).json({ error: "OpenAI TTS failed", detail: error.message });
  }
}

async function ttsElevenLabs(text: string, personaId: string, res: any) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ElevenLabs not configured" });

  try {
    const voiceId = ELEVENLABS_VOICES[personaId] || "21m00Tcm4TlvDq8ikWAM";
    const keyPreview = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
    console.log(`[TTS:ElevenLabs] voiceId="${voiceId}" persona="${personaId}" keyPreview="${keyPreview}" keyLength=${apiKey.length}`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[TTS:ElevenLabs] API error ${response.status}: ${errBody}`);

      // If ElevenLabs fails and OpenAI is available, try OpenAI as fallback
      if (process.env.OPENAI_API_KEY) {
        console.log("[TTS:ElevenLabs] Falling back to OpenAI");
        return ttsOpenAI(text, personaId, 1.0, res);
      }

      throw new Error(`ElevenLabs API returned ${response.status}: ${errBody}`);
    }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": buffer.length.toString(), "Cache-Control": "public, max-age=3600" });
    res.send(buffer);
  } catch (error: any) {
    console.error("[TTS:ElevenLabs] Error:", error.message);
    res.status(500).json({ error: "ElevenLabs TTS failed", detail: error.message });
  }
}

// === LLM Reaction Endpoints ===

app.post("/api/react", async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "LLM not configured." });

  const { personaId, userText, sessionType, messageHistory } = req.body;
  if (!personaId || !userText) return res.status(400).json({ error: "personaId and userText required" });

  try {
    const persona = getPersonaPrompt(personaId);
    const prompt = buildReactionPrompt(persona, userText, sessionType || "business-pitch", messageHistory || []);
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 300,
      system: persona.systemPrompt, messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = safeParseJSON(text);
    if (!parsed) throw new Error("Failed to parse JSON");
    res.json(parsed);
  } catch (error: any) {
    console.error("Reaction error:", error.message);
    res.status(500).json({ error: "Failed to generate reaction", detail: error.message });
  }
});

app.post("/api/react-batch", async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "LLM not configured." });

  const { personaIds, userText, sessionType, messageHistory } = req.body;
  if (!personaIds?.length || !userText) return res.status(400).json({ error: "personaIds and userText required" });

  try {
    const results = await Promise.allSettled(
      personaIds.map(async (personaId: string) => {
        const persona = getPersonaPrompt(personaId);
        const prompt = buildReactionPrompt(persona, userText, sessionType || "business-pitch", messageHistory || []);
        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001", max_tokens: 300,
          system: persona.systemPrompt, messages: [{ role: "user", content: prompt }],
        });
        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const parsed = safeParseJSON(text);
        if (!parsed) throw new Error("Failed to parse JSON");
        return { personaId, ...parsed };
      })
    );

    const reactions = results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled").map((r) => r.value);
    const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r, i) => ({ personaId: personaIds[i], error: r.reason?.message }));
    res.json({ reactions, errors });
  } catch (error: any) {
    console.error("Batch reaction error:", error.message);
    res.status(500).json({ error: "Failed to generate reactions" });
  }
});

// === LLM Feedback Endpoints ===

app.post("/api/feedback", async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "LLM not configured." });

  const { personaId, transcript, sessionType } = req.body;
  if (!personaId || !transcript) return res.status(400).json({ error: "personaId and transcript required" });

  try {
    const persona = getPersonaPrompt(personaId);
    const prompt = buildFeedbackPrompt(persona, transcript, sessionType || "business-pitch");
    console.log(`[Feedback] Generating for ${personaId}...`);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1500,
      system: persona.systemPrompt, messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    console.log(`[Feedback] Raw for ${personaId}: ${text.substring(0, 100)}...`);
    const parsed = safeParseJSON(text);
    if (!parsed) return res.status(500).json({ error: "Failed to parse LLM response" });

    console.log(`[Feedback] Success for ${personaId}: score ${parsed.overallScore}`);
    res.json({ personaId, personaName: personaId, ...parsed });
  } catch (error: any) {
    console.error(`[Feedback] Error for ${personaId}:`, error.message);
    res.status(500).json({ error: "Failed to generate feedback", detail: error.message });
  }
});

app.post("/api/feedback-batch", async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: "LLM not configured." });

  const { personaIds, transcript, sessionType } = req.body;
  if (!personaIds?.length || !transcript) return res.status(400).json({ error: "personaIds and transcript required" });

  try {
    const feedback: any[] = [];
    for (const personaId of personaIds) {
      try {
        const persona = getPersonaPrompt(personaId);
        const prompt = buildFeedbackPrompt(persona, transcript, sessionType || "business-pitch");
        const message = await client.messages.create({
          model: "claude-sonnet-4-6", max_tokens: 1500,
          system: persona.systemPrompt, messages: [{ role: "user", content: prompt }],
        });
        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const parsed = safeParseJSON(text);
        if (!parsed) throw new Error("Failed to parse JSON");
        feedback.push({ personaId, ...parsed });
        console.log(`[Feedback-Batch] ${personaId}: score ${parsed.overallScore}`);
      } catch (err: any) {
        console.error(`[Feedback-Batch] Failed for ${personaId}:`, err.message);
      }
    }
    res.json({ feedback });
  } catch (error: any) {
    console.error("Batch feedback error:", error.message);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
});

// === SPA Fallback ===
app.use((_req: any, res: any) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  const ttsProviders: string[] = [];
  if (process.env.OPENAI_API_KEY) ttsProviders.push("openai");
  if (process.env.ELEVENLABS_API_KEY) ttsProviders.push("elevenlabs");
  console.log(`Server running on port ${PORT}`);
  console.log(`LLM: ${!!process.env.ANTHROPIC_API_KEY ? "yes" : "no"}`);
  console.log(`TTS providers: ${ttsProviders.length > 0 ? ttsProviders.join(", ") : "none"}`);
});

function safeParseJSON(text: string): any {
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
