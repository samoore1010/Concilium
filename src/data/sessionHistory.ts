import { SpeechMetrics } from "../hooks/useSpeechMetrics";

export interface ProsodyRecord {
  averageVolume: number;
  volumeVariation: number;
  pitchVariation: number;
  energyLevel: number;
  silenceRatio: number;
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
