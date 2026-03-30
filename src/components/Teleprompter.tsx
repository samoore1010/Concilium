import { useState, useEffect, useRef } from "react";

interface TeleprompterProps {
  script: string;
  isActive: boolean;
  onToggle: () => void;
}

export function Teleprompter({ script, isActive, onToggle }: TeleprompterProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 0.5);
    }, 50);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  if (!script) return null;

  // Collapsed: just a small toggle button
  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-2 left-2 z-30 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-[10px] text-white/60 hover:text-white/90 transition-colors flex items-center gap-1.5"
      >
        <span>📄</span> <span>Show Script</span>
      </button>
    );
  }

  // Active: semi-transparent overlay at bottom of audience area
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col" style={{ maxHeight: "35%" }}>
      {/* Controls bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-black/70 backdrop-blur-md border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/30 uppercase tracking-wider">Teleprompter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="w-5 h-5 rounded bg-white/10 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center">A-</button>
          <button onClick={() => setFontSize((s) => Math.min(24, s + 2))} className="w-5 h-5 rounded bg-white/10 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center">A+</button>
          <button onClick={() => setScrollPosition(0)} className="w-5 h-5 rounded bg-white/10 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center" title="Reset">↑</button>
          <button onClick={onToggle} className="px-2 h-5 rounded bg-white/10 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center">Hide</button>
        </div>
      </div>

      {/* Script text */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-3 bg-black/60 backdrop-blur-md"
        onWheel={() => {
          if (containerRef.current) setScrollPosition(containerRef.current.scrollTop);
        }}
      >
        <div
          className="text-white/90 leading-relaxed font-light text-center max-w-2xl mx-auto"
          style={{ fontSize: `${fontSize}px`, lineHeight: "1.7" }}
        >
          {script}
        </div>
        <div className="h-[30vh]" />
      </div>

      {/* Gradient fades */}
      <div className="absolute top-[28px] left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
