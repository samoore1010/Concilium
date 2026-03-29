import { SpeechMetrics } from "../hooks/useSpeechMetrics";

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
}

// In-memory store (not using localStorage as per requirements)
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

export function clearHistory(): void {
  sessionHistory = [];
}
