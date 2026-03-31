import { SpeechMetrics } from "../hooks/useSpeechMetrics";

export interface ProsodyRecord {
  averageVolume: number;
  volumeVariation: number;
  pitchVariation: number;
  energyLevel: number;
  silenceRatio: number;
}

export interface StoredFeedback {
  personaId: string;
  personaName: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
  emotionalResponse: string;
}

export interface SessionRecord {
  id: string;
  date: number;
  sessionType: string;
  personaIds: string[];
  overallScore: number;
  perPersonaScores: Record<string, number>;
  wordCount: number;
  duration: number;
  speechMetrics: SpeechMetrics;
  prosodyMetrics?: ProsodyRecord;
  feedback?: StoredFeedback[];
  transcript?: string;
}

let sessionHistory: SessionRecord[] = [];

export function addSession(session: SessionRecord): void {
  sessionHistory.push(session);
}

export function getSessionHistory(): SessionRecord[] {
  return [...sessionHistory];
}

export function getRecentSessions(count: number = 3): SessionRecord[] {
  return sessionHistory.slice(-count).reverse();
}

export function getSessionById(id: string): SessionRecord | undefined {
  return sessionHistory.find((s) => s.id === id);
}

export function clearHistory(): void {
  sessionHistory = [];
}

// Persist session to backend API (fire-and-forget, does not block UI)
export function saveSessionToApi(session: SessionRecord, token: string | null): void {
  if (!token) return;

  fetch("/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionType: session.sessionType,
      personas: session.personaIds,
      transcript: session.transcript,
      feedback: session.feedback,
      prosodyData: session.prosodyMetrics,
      speechMetrics: session.speechMetrics,
      overallScore: session.overallScore,
      wordCount: session.wordCount,
      durationSeconds: session.duration,
    }),
  }).catch((err) => {
    console.error("[SessionHistory] Failed to save session to API:", err);
  });
}

// Fetch session history from backend API
export async function fetchSessionsFromApi(
  token: string | null,
  limit = 20
): Promise<SessionRecord[]> {
  if (!token) return [];

  try {
    const res = await fetch(`/api/sessions?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.sessions.map((s: any) => ({
      id: s.id as string,
      date: new Date(s.createdAt as string).getTime(),
      sessionType: (s.sessionType as string) || "",
      personaIds: (s.personas as string[]) || [],
      overallScore: (s.overallScore as number) || 0,
      perPersonaScores: {} as Record<string, number>,
      wordCount: (s.wordCount as number) || 0,
      duration: (s.durationSeconds as number) || 0,
      speechMetrics: s.speechMetrics || { wordsPerMinute: 0, fillerWordCount: 0, longestPause: 0, vocabularyScore: 0 },
      prosodyMetrics: s.prosodyData,
      feedback: s.feedback,
      transcript: s.transcript as string,
    }));
  } catch {
    return [];
  }
}
