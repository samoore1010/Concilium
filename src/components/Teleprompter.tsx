import { useState, useEffect, useRef } from "react";

interface TeleprompterProps {
  script: string;
  isActive: boolean;
  onToggle: () => void;
}

export function Teleprompter({ script, isActive, onToggle }: TeleprompterProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [expanded, setExpanded] = useState(false); // mobile: peek vs full
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
        className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-30 w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-[9px] md:text-[10px] text-white/60 hover:text-white/90 flex items-center justify-center md:gap-1"
      >
        <span>📄</span>
        <span className="hidden md:inline">Script</span>
      </button>
    );
  }

  // Mobile: peek (2 lines) vs expanded (20dvh)
  // Desktop: always shows at 30%
  const mobileHeight = expanded ? "20dvh" : "48px";

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col transition-all duration-200"
      style={{ maxHeight: typeof window !== "undefined" && window.innerWidth < 768 ? mobileHeight : "30%" }}
    >
      <div className="flex items-center justify-between px-2 md:px-3 py-1 bg-black/80 backdrop-blur-md border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-wider">Script</span>
          {/* Mobile: peek/expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="md:hidden text-[9px] text-white/40 hover:text-white/70"
          >
            {expanded ? "▼ Less" : "▲ More"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="w-6 h-6 md:w-5 md:h-5 rounded bg-white/10 text-[9px] text-white/50 flex items-center justify-center">A-</button>
          <button onClick={() => setFontSize((s) => Math.min(22, s + 1))} className="w-6 h-6 md:w-5 md:h-5 rounded bg-white/10 text-[9px] text-white/50 flex items-center justify-center">A+</button>
          <button onClick={onToggle} className="w-6 h-6 md:w-5 md:h-5 rounded bg-white/10 text-[9px] text-white/50 flex items-center justify-center">✕</button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-touch px-3 md:px-6 py-2 bg-black/70 backdrop-blur-md"
        onWheel={() => { if (containerRef.current) setScrollPosition(containerRef.current.scrollTop); }}
        onTouchStart={() => { if (containerRef.current) setScrollPosition(containerRef.current.scrollTop); }}
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
