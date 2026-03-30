import { useState, useRef, useEffect, useCallback } from "react";
import { ProsodyFrame } from "../hooks/useProsody";

export interface SessionEvent {
  time: number;       // seconds
  type: "filler" | "volume-drop" | "monotone" | "emphasis" | "interrupt" | "silence";
  label: string;
  severity: "info" | "warning" | "good";
}

interface SessionPlaybackProps {
  audioUrl: string;
  duration: number;
  timeline: ProsodyFrame[];
  events: SessionEvent[];
  transcript: string;
}

export function SessionPlayback({ audioUrl, duration, timeline, events, transcript }: SessionPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeMetric, setActiveMetric] = useState<"volume" | "pitch" | "energy">("volume");
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw the waveform/prosody graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timeline.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw the selected metric as a filled area
    const maxTime = timeline[timeline.length - 1]?.time || duration || 1;

    // Volume bars (background)
    ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
    timeline.forEach((frame) => {
      const x = (frame.time / maxTime) * w;
      const barH = (frame.volume / 100) * h;
      ctx.fillRect(x - 0.5, h - barH, 1.5, barH);
    });

    // Active metric line
    const getVal = (f: ProsodyFrame) => {
      if (activeMetric === "volume") return f.volume;
      if (activeMetric === "pitch") return Math.min(100, (f.pitch / 400) * 100);
      return f.energy;
    };

    const colors = { volume: "#6366f1", pitch: "#f59e0b", energy: "#10b981" };
    ctx.strokeStyle = colors[activeMetric];
    ctx.lineWidth = 2;
    ctx.beginPath();
    timeline.forEach((frame, i) => {
      const x = (frame.time / maxTime) * w;
      const y = h - (getVal(frame) / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under the line
    const lastFrame = timeline[timeline.length - 1];
    if (lastFrame) {
      ctx.lineTo((lastFrame.time / maxTime) * w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = colors[activeMetric] + "15";
      ctx.fill();
    }

    // Draw event markers
    events.forEach((evt) => {
      const x = (evt.time / maxTime) * w;
      const markerColors = { info: "#6366f1", warning: "#f59e0b", good: "#10b981" };
      ctx.fillStyle = markerColors[evt.severity];
      ctx.beginPath();
      ctx.arc(x, 8, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw playback position
    if (currentTime > 0) {
      const px = (currentTime / maxTime) * w;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      // Playhead dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [timeline, events, currentTime, activeMetric, duration]);

  // Sync audio time to state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTime = () => setCurrentTime(audio.currentTime);
    const handleEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("ended", handleEnd);
    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("ended", handleEnd);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackSpeed;
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, playbackSpeed]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const maxTime = timeline[timeline.length - 1]?.time || duration || 1;
    audio.currentTime = pct * maxTime;
    setCurrentTime(audio.currentTime);
  }, [timeline, duration]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  // Find events near current playback time
  const activeEvents = events.filter((e) => Math.abs(e.time - currentTime) < 2);

  if (!audioUrl) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        No audio recording available for this session.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Metric selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/40">Show:</span>
        {(["volume", "pitch", "energy"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setActiveMetric(m)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              activeMetric === m
                ? m === "volume" ? "bg-indigo-500/20 text-indigo-300"
                : m === "pitch" ? "bg-amber-500/20 text-amber-300"
                : "bg-emerald-500/20 text-emerald-300"
                : "bg-white/5 text-white/40"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Waveform canvas */}
      <div ref={containerRef} className="relative rounded-lg bg-white/[0.02] border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full cursor-pointer"
          style={{ height: 120 }}
          onClick={seekTo}
        />
        {/* Time labels */}
        <div className="absolute bottom-1 left-2 text-[9px] text-white/30">{formatTime(currentTime)}</div>
        <div className="absolute bottom-1 right-2 text-[9px] text-white/30">{formatTime(duration)}</div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Speed:</span>
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => {
                setPlaybackSpeed(s);
                if (audioRef.current) audioRef.current.playbackRate = s;
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded ${playbackSpeed === s ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-white/40"}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Event markers list */}
      {events.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Session Events</div>
          <div className="max-h-[200px] overflow-y-auto scroll-touch space-y-1">
            {events.map((evt, i) => {
              const isActive = Math.abs(evt.time - currentTime) < 2;
              const colors = { info: "text-indigo-400", warning: "text-amber-400", good: "text-emerald-400" };
              const icons = { filler: "🔇", "volume-drop": "📉", monotone: "😐", emphasis: "💪", interrupt: "✋", silence: "⏸" };
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = evt.time;
                      setCurrentTime(evt.time);
                    }
                  }}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${
                    isActive ? "bg-white/10" : "bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs">{icons[evt.type] || "📌"}</span>
                  <span className="text-white/30 font-mono text-[10px] w-10">{formatTime(evt.time)}</span>
                  <span className={colors[evt.severity]}>{evt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Generate events from prosody timeline and speech metrics
export function generateSessionEvents(
  timeline: ProsodyFrame[],
  fillerWordCount: number,
  chatMessages: { from: string; text: string; time: number }[]
): SessionEvent[] {
  const events: SessionEvent[] = [];
  if (timeline.length === 0) return events;

  // Detect volume drops (below 15 for 2+ seconds)
  let lowVolStart: number | null = null;
  for (const frame of timeline) {
    if (frame.volume < 15 && !frame.isSilent) {
      if (lowVolStart === null) lowVolStart = frame.time;
    } else {
      if (lowVolStart !== null && frame.time - lowVolStart >= 2) {
        events.push({ time: lowVolStart, type: "volume-drop", label: `Volume dropped for ${(frame.time - lowVolStart).toFixed(1)}s`, severity: "warning" });
      }
      lowVolStart = null;
    }
  }

  // Detect monotone stretches (pitch variation < 5 for 5+ seconds)
  for (let i = 0; i < timeline.length; i++) {
    const window = timeline.slice(i, i + 50); // ~5 seconds at 100ms intervals
    if (window.length < 50) break;
    const pitches = window.filter((f) => f.pitch > 0).map((f) => f.pitch);
    if (pitches.length > 10) {
      const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const variance = pitches.reduce((s, p) => s + (p - avg) ** 2, 0) / pitches.length;
      if (Math.sqrt(variance) < 15) {
        events.push({ time: window[0].time, type: "monotone", label: "Monotone stretch — vary your pitch", severity: "warning" });
        i += 50; // Skip ahead
      }
    }
  }

  // Detect long silences (3+ seconds)
  let silenceStart: number | null = null;
  for (const frame of timeline) {
    if (frame.isSilent) {
      if (silenceStart === null) silenceStart = frame.time;
    } else {
      if (silenceStart !== null && frame.time - silenceStart >= 3) {
        events.push({ time: silenceStart, type: "silence", label: `${(frame.time - silenceStart).toFixed(1)}s pause`, severity: "info" });
      }
      silenceStart = null;
    }
  }

  // Detect high-energy moments
  for (let i = 10; i < timeline.length - 10; i++) {
    const prev = timeline.slice(i - 10, i);
    const curr = timeline.slice(i, i + 10);
    const prevEnergy = prev.reduce((s, f) => s + f.energy, 0) / prev.length;
    const currEnergy = curr.reduce((s, f) => s + f.energy, 0) / curr.length;
    if (currEnergy - prevEnergy > 25) {
      events.push({ time: timeline[i].time, type: "emphasis", label: "Great energy build!", severity: "good" });
      i += 30; // Skip ahead
    }
  }

  // Audience interrupts from chat
  chatMessages.forEach((msg) => {
    if (msg.from !== "You") {
      events.push({ time: msg.time, type: "interrupt", label: `${msg.from} spoke`, severity: "info" });
    }
  });

  // Sort by time
  events.sort((a, b) => a.time - b.time);
  return events;
}
