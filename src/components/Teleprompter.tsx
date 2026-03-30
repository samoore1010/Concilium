import { useState, useEffect, useRef } from "react";

interface TeleprompterProps {
  script: string;
  isActive: boolean;
  onToggle: () => void;
}

export function Teleprompter({ script, isActive, onToggle }: TeleprompterProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setScrollPosition((prev) => prev + 0.4), 50);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = scrollPosition;
  }, [scrollPosition]);

  if (!script) return null;

  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-30 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-[9px] md:text-[10px] text-white/60 hover:text-white/90 flex items-center gap-1"
      >
        📄 <span className="hidden sm:inline">Show Script</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col" style={{ maxHeight: "30%" }}>
      <div className="flex items-center justify-between px-2 md:px-3 py-1 bg-black/80 backdrop-blur-md border-t border-white/10 flex-shrink-0">
        <span className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-wider">Script</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="w-5 h-5 rounded bg-white/10 text-[9px] text-white/50 hover:text-white/80 flex items-center justify-center">A-</button>
          <button onClick={() => setFontSize((s) => Math.min(22, s + 1))} className="w-5 h-5 rounded bg-white/10 text-[9px] text-white/50 hover:text-white/80 flex items-center justify-center">A+</button>
          <button onClick={onToggle} className="px-1.5 h-5 rounded bg-white/10 text-[9px] text-white/50 hover:text-white/80 flex items-center justify-center">✕</button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 md:px-6 py-2 bg-black/70 backdrop-blur-md"
        onWheel={() => { if (containerRef.current) setScrollPosition(containerRef.current.scrollTop); }}
      >
        <div
          className="text-white/90 leading-relaxed font-light text-center max-w-xl mx-auto"
          style={{ fontSize: `${fontSize}px`, lineHeight: "1.6" }}
        >
          {script}
        </div>
        <div className="h-[20vh]" />
      </div>
    </div>
  );
}
