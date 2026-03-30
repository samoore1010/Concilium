import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TeleprompterProps {
  script: string;
  isActive: boolean;
  onToggle: () => void;
}

export function Teleprompter({ script, isActive, onToggle }: TeleprompterProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll slowly when active
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

  return (
    <motion.div
      className={`absolute top-0 left-0 bottom-0 z-20 flex flex-col bg-black/80 backdrop-blur-md border-r border-white/10 transition-all ${
        isActive ? "w-[300px] md:w-[350px]" : "w-10"
      }`}
      layout
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center py-2 text-white/50 hover:text-white/80 border-b border-white/10 flex-shrink-0"
        title={isActive ? "Hide teleprompter" : "Show teleprompter"}
      >
        {isActive ? (
          <span className="text-[10px] font-medium">📄 Hide Script</span>
        ) : (
          <span className="text-base">📄</span>
        )}
      </button>

      {isActive && (
        <>
          {/* Font size controls */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 flex-shrink-0">
            <span className="text-[9px] text-white/30">TELEPROMPTER</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFontSize((s) => Math.max(12, s - 2))}
                className="w-5 h-5 rounded bg-white/5 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center"
              >A-</button>
              <button
                onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                className="w-5 h-5 rounded bg-white/5 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center"
              >A+</button>
              <button
                onClick={() => setScrollPosition(0)}
                className="w-5 h-5 rounded bg-white/5 text-[10px] text-white/50 hover:text-white/80 flex items-center justify-center"
                title="Reset scroll"
              >↑</button>
            </div>
          </div>

          {/* Script text */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
            onWheel={() => {
              // Allow manual scroll override
              if (containerRef.current) {
                setScrollPosition(containerRef.current.scrollTop);
              }
            }}
          >
            <div
              className="text-white/90 leading-relaxed font-light"
              style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}
            >
              {script}
            </div>
            {/* Extra space at bottom so you can scroll past the end */}
            <div className="h-[50vh]" />
          </div>

          {/* Gradient fade at top and bottom */}
          <div className="absolute top-[72px] left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </>
      )}
    </motion.div>
  );
}
