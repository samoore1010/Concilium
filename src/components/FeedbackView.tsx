import { useState, useEffect } from "react";
import { FeedbackItem } from "../data/feedbackEngine";
import { PERSONA_LIBRARY, Persona } from "../data/personas";
import { MiiAvatar } from "./MiiAvatar";
import { getSessionHistory, SessionRecord } from "../data/sessionHistory";

interface FeedbackViewProps {
  feedback: FeedbackItem[];
  transcript: string;
  onNewSession: () => void;
}

export function FeedbackView({ feedback, transcript, onNewSession }: FeedbackViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<"feedback" | "history">("feedback");
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);

  const avgScore = feedback.length > 0
    ? Math.round((feedback.reduce((sum, f) => sum + f.overallScore, 0) / feedback.length) * 10) / 10
    : 0;

  useEffect(() => {
    setSessionHistory(getSessionHistory());
  }, []);

  const selected = feedback[selectedIdx];
  const persona = PERSONA_LIBRARY.find((p) => p.id === selected?.personaId);

  const scoreColor = (score: number) => {
    if (score >= 7) return "text-emerald-400";
    if (score >= 5) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 7) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 5) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Session Feedback</h1>
            <p className="text-xs text-white/40">Review individual critiques from your audience</p>
          </div>
          <button
            onClick={onNewSession}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
          >
            New Session
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab selector */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setTab("feedback")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "feedback"
                ? "border-blue-400 text-white"
                : "border-transparent text-white/50 hover:text-white/70"
            }`}
          >
            Detailed Feedback
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "history"
                ? "border-blue-400 text-white"
                : "border-transparent text-white/50 hover:text-white/70"
            }`}
          >
            Session History
          </button>
        </div>

        {tab === "feedback" && (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`rounded-lg border p-4 ${scoreBg(avgScore)}`}>
                <div className="text-xs text-white/50 mb-1">Overall Score</div>
                <div className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</div>
                <div className="text-xs text-white/30 mt-1">out of 10</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs text-white/50 mb-1">Audience Size</div>
                <div className="text-3xl font-bold">{feedback.length}</div>
                <div className="text-xs text-white/30 mt-1">personas evaluated</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs text-white/50 mb-1">Words Spoken</div>
                <div className="text-3xl font-bold">{transcript.split(/\s+/).filter(Boolean).length}</div>
                <div className="text-xs text-white/30 mt-1">in session</div>
              </div>
            </div>

            {/* Persona tabs + detail */}
            <div className="flex gap-6">
          {/* Left — persona list */}
          <div className="w-56 flex-shrink-0 space-y-2">
            {feedback.map((fb, i) => {
              const p = PERSONA_LIBRARY.find((pp) => pp.id === fb.personaId);
              if (!p) return null;
              return (
                <button
                  key={fb.personaId}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    i === selectedIdx
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <MiiAvatar persona={p} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className={`text-xs font-bold ${scoreColor(fb.overallScore)}`}>
                      {fb.overallScore}/10
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right — detailed feedback */}
          {selected && persona && (
            <div className="flex-1 space-y-6">
              {/* Persona header */}
              <div className="flex items-start gap-5">
                <MiiAvatar persona={persona} size={100} reaction={selected.overallScore >= 6 ? "smile" : selected.overallScore >= 4 ? "think" : "frown"} />
                <div>
                  <h2 className="text-xl font-semibold mb-1">{persona.name}</h2>
                  <p className="text-sm text-white/50 mb-2">{persona.bio}</p>
                  <div className="flex gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">{persona.profession}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{persona.politicalLeaning}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-300">{persona.communicationStyle}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/50">Age {persona.age}</span>
                  </div>
                </div>
              </div>

              {/* Score card */}
              <div className={`rounded-lg border p-5 ${scoreBg(selected.overallScore)}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-4xl font-bold ${scoreColor(selected.overallScore)}`}>
                    {selected.overallScore}
                  </div>
                  <div>
                    <div className="text-sm font-medium">Overall Impression</div>
                    <div className="text-xs text-white/50">{selected.emotionalResponse}</div>
                  </div>
                </div>
                {/* Score bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      selected.overallScore >= 7 ? "bg-emerald-400" : selected.overallScore >= 5 ? "bg-yellow-400" : "bg-red-400"
                    }`}
                    style={{ width: `${selected.overallScore * 10}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                <h3 className="text-sm font-medium text-white/70 mb-2">Summary</h3>
                <p className="text-sm text-white/60 leading-relaxed">{selected.summary}</p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <h3 className="text-sm font-medium text-emerald-400 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {selected.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
                  <h3 className="text-sm font-medium text-red-400 mb-3">Areas for Improvement</h3>
                  <ul className="space-y-2">
                    {selected.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestion */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Suggestion</h3>
                <p className="text-sm text-white/60 leading-relaxed italic">"{selected.suggestion}"</p>
                <p className="text-xs text-white/30 mt-2">— {persona.name}, {persona.profession}</p>
              </div>
            </div>
          )}
            </div>
          </>
        )}

        {tab === "history" && (
          <div>
            {sessionHistory.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <p>No session history yet. Start practicing to build your history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionHistory.map((session) => {
                  const avgSessionScore = Object.values(session.perPersonaScores).reduce((a, b) => a + b, 0) / Object.values(session.perPersonaScores).length;
                  const date = new Date(session.date).toLocaleDateString();
                  const time = new Date(session.date).toLocaleTimeString();
                  return (
                    <div key={session.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-medium text-white mb-1">
                            {session.sessionType.replace(/-/g, " ")}
                          </div>
                          <div className="text-xs text-white/50">
                            {date} at {time}
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${scoreColor(avgSessionScore)}`}>
                          {avgSessionScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-white/50">Personas</div>
                          <div className="text-white font-medium">{session.personaIds.length}</div>
                        </div>
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-white/50">Words</div>
                          <div className="text-white font-medium">{session.wordCount}</div>
                        </div>
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-white/50">Duration</div>
                          <div className="text-white font-medium">{Math.floor(session.duration / 60)}m</div>
                        </div>
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-white/50">WPM</div>
                          <div className="text-white font-medium">{session.speechMetrics.wordsPerMinute}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
