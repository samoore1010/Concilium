import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest, requireAuth } from "./auth.js";
import { getDb } from "./db.js";

export const sessionsRouter = Router();

// All session routes require authentication
sessionsRouter.use(requireAuth);

// POST /api/sessions — save a practice session
sessionsRouter.post("/", (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    sessionType,
    personas,
    transcript,
    feedback,
    prosodyData,
    speechMetrics,
    overallScore,
    wordCount,
    durationSeconds,
  } = req.body;

  try {
    const id = uuidv4();
    const db = getDb();
    db.prepare(`
      INSERT INTO sessions (id, user_id, session_type, personas, transcript, feedback, prosody_data, speech_metrics, overall_score, word_count, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.id,
      sessionType || null,
      personas ? JSON.stringify(personas) : null,
      transcript || null,
      feedback ? JSON.stringify(feedback) : null,
      prosodyData ? JSON.stringify(prosodyData) : null,
      speechMetrics ? JSON.stringify(speechMetrics) : null,
      overallScore ?? null,
      wordCount ?? null,
      durationSeconds ?? null,
    );

    console.log(`[Sessions] Saved session ${id} for user ${user.email}`);
    res.status(201).json({ id });
  } catch (err: any) {
    console.error("[Sessions] Save error:", err.message);
    res.status(500).json({ error: "Failed to save session" });
  }
});

// GET /api/sessions — list user's sessions (most recent first)
sessionsRouter.get("/", (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, session_type, personas, overall_score, word_count, duration_seconds, created_at
      FROM sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(user.id, limit, offset) as any[];

    const sessions = rows.map((row) => ({
      id: row.id,
      sessionType: row.session_type,
      personas: row.personas ? JSON.parse(row.personas) : [],
      overallScore: row.overall_score,
      wordCount: row.word_count,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    }));

    res.json({ sessions });
  } catch (err: any) {
    console.error("[Sessions] List error:", err.message);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// GET /api/sessions/:id — get full session detail
sessionsRouter.get("/:id", (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND user_id = ?
    `).get(req.params.id, user.id) as any;

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({
      id: row.id,
      sessionType: row.session_type,
      personas: row.personas ? JSON.parse(row.personas) : [],
      transcript: row.transcript,
      feedback: row.feedback ? JSON.parse(row.feedback) : [],
      prosodyData: row.prosody_data ? JSON.parse(row.prosody_data) : null,
      speechMetrics: row.speech_metrics ? JSON.parse(row.speech_metrics) : null,
      overallScore: row.overall_score,
      wordCount: row.word_count,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    });
  } catch (err: any) {
    console.error("[Sessions] Get error:", err.message);
    res.status(500).json({ error: "Failed to get session" });
  }
});
