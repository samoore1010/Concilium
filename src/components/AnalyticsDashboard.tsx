import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

interface AnalyticsSession {
  id: string;
  sessionType: string;
  personas: string[];
  overallScore: number | null;
  wordCount: number | null;
  durationSeconds: number | null;
  createdAt: string;
}

interface TrendPoint {
  score: number;
  wordCount: number;
  durationSeconds: number;
  createdAt: string;
}

interface FeedbackTheme {
  theme: string;
  count: number;
  type: "strength" | "weakness";
}

interface AnalyticsStats {
  totalSessions: number;
  avgScore: number;
  totalDuration: number;
  totalWords: number;
}

interface AnalyticsData {
  sessions: AnalyticsSession[];
  trends: TrendPoint[];
  feedbackThemes: FeedbackTheme[];
  stats: AnalyticsStats;
}

interface AnalyticsDashboardProps {
  onBack: () => void;
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"history" | "trends" | "feedback">("history");

  useEffect(() => {
    if (!token) return;
    fetch("/api/sessions/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f0f23] text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] bg-[#0f0f23] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-sm">{error || "No data available"}</p>
        <button onClick={onBack} className="text-sm text-blue-400 hover:text-blue-300">Go back</button>
      </div>
    );
  }

  const { sessions, trends, feedbackThemes, stats } = data;

  return (
    <div className="min-h-[100dvh] bg-[#0f0f23] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base md:text-lg font-semibold">Analytics Dashboard</h1>
            <p className="text-[11px] md:text-xs text-white/40">Track your practice progress</p>
          </div>
          <button onClick={onBack} className="px-3 md:px-4 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs md:text-sm font-medium transition-colors">
            Back
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard label="Sessions" value={String(stats.totalSessions)} />
          <StatCard label="Avg Score" value={stats.avgScore ? `${stats.avgScore}/10` : "—"} color={scoreColor(stats.avgScore)} />
          <StatCard label="Total Time" value={formatDuration(stats.totalDuration)} />
          <StatCard label="Words Spoken" value={stats.totalWords ? stats.totalWords.toLocaleString() : "0"} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 md:mb-8 border-b border-white/10">
          {(["history", "trends", "feedback"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 capitalize ${
                tab === t ? "border-blue-400 text-white" : "border-transparent text-white/50 hover:text-white/70"
              }`}
            >
              {t === "feedback" ? "Feedback Themes" : t === "history" ? "Session History" : "Performance Trends"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "history" && <SessionHistory sessions={sessions} />}
        {tab === "trends" && <PerformanceTrends trends={trends} />}
        {tab === "feedback" && <FeedbackSummary themes={feedbackThemes} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <motion.div
      className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-[10px] md:text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-lg md:text-2xl font-semibold ${color || "text-white"}`}>{value}</div>
    </motion.div>
  );
}

function SessionHistory({ sessions }: { sessions: AnalyticsSession[] }) {
  if (sessions.length === 0) {
    return <EmptyState message="No sessions yet. Complete a practice session to see your history." />;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 flex items-center justify-between"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs md:text-sm font-medium truncate">
                {formatSessionType(session.sessionType)}
              </span>
              {session.personas.length > 0 && (
                <span className="text-[10px] text-white/30">
                  {session.personas.length} persona{session.personas.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] md:text-xs text-white/40">
              <span>{formatDate(session.createdAt)}</span>
              {session.durationSeconds != null && <span>{formatDuration(session.durationSeconds)}</span>}
              {session.wordCount != null && <span>{session.wordCount} words</span>}
            </div>
          </div>
          {session.overallScore != null && (
            <div className={`text-sm md:text-base font-semibold ${scoreColor(session.overallScore)}`}>
              {session.overallScore.toFixed(1)}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function PerformanceTrends({ trends }: { trends: TrendPoint[] }) {
  if (trends.length < 2) {
    return <EmptyState message="Complete at least 2 scored sessions to see performance trends." />;
  }

  const scores = trends.map((t) => t.score);
  const maxScore = Math.max(...scores, 10);
  const minScore = Math.min(...scores, 0);
  const range = maxScore - minScore || 1;

  // SVG chart dimensions
  const w = 800;
  const h = 200;
  const padX = 40;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = trends.map((t, i) => ({
    x: padX + (i / (trends.length - 1)) * chartW,
    y: padY + chartH - ((t.score - minScore) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  // Trend direction
  const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
  const olderAvg = scores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
  const improving = recentAvg > olderAvg;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs font-medium px-2 py-1 rounded ${improving ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
          {improving ? "Improving" : "Needs focus"}
        </span>
        <span className="text-xs text-white/40">
          Recent avg: {recentAvg.toFixed(1)} / Earlier avg: {olderAvg.toFixed(1)}
        </span>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto min-w-[400px]" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 2.5, 5, 7.5, 10].map((val) => {
            const y = padY + chartH - ((val - minScore) / range) * chartH;
            if (y < padY || y > padY + chartH) return null;
            return (
              <g key={val}>
                <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={padX - 8} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#scoreGradient)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#60a5fa" stroke="#0f0f23" strokeWidth="1.5" />
          ))}

          {/* Gradient def */}
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Score list below chart */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {trends.slice(-10).map((t, i) => (
          <div key={i} className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            {formatDate(t.createdAt)}: <span className={scoreColor(t.score)}>{t.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackSummary({ themes }: { themes: FeedbackTheme[] }) {
  if (themes.length === 0) {
    return <EmptyState message="Complete sessions with feedback to see common themes." />;
  }

  const maxCount = Math.max(...themes.map((t) => t.count));
  const strengths = themes.filter((t) => t.type === "strength");
  const weaknesses = themes.filter((t) => t.type === "weakness");

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ThemeList title="Strengths" themes={strengths} maxCount={maxCount} colorClass="bg-emerald-400" />
      <ThemeList title="Areas to Improve" themes={weaknesses} maxCount={maxCount} colorClass="bg-amber-400" />
    </div>
  );
}

function ThemeList({ title, themes, maxCount, colorClass }: { title: string; themes: FeedbackTheme[]; maxCount: number; colorClass: string }) {
  if (themes.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium mb-3 text-white/60">{title}</h3>
        <p className="text-xs text-white/30">No data yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-3 text-white/60">{title}</h3>
      <div className="space-y-2">
        {themes.map((theme, i) => (
          <motion.div
            key={theme.theme}
            className="bg-white/5 border border-white/10 rounded-lg p-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs md:text-sm capitalize">{theme.theme}</span>
              <span className="text-[10px] text-white/40">{theme.count}x</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(theme.count / maxCount) * 100}%` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-white/20 text-4xl mb-4">--</div>
      <p className="text-sm text-white/40">{message}</p>
    </div>
  );
}

// Helpers

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSessionType(type: string): string {
  if (!type) return "Practice Session";
  return type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
