import { Persona, ReactionType } from "../data/personas";
import { MiiAvatar } from "./MiiAvatar";

interface AudienceTileProps {
  persona: Persona;
  reaction: ReactionType;
  reactionEmoji?: string;
  isActive?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  onClick?: () => void;
}

export function AudienceTile({ persona, reaction, reactionEmoji, isActive, isMuted = true, isSpeaking, onClick }: AudienceTileProps) {
  const getReactionGlowClass = () => {
    if (isSpeaking) return "reaction-glow-speaking";
    if (reaction === "nod" || reaction === "smile") return "reaction-glow-positive";
    if (reaction === "think") return "reaction-glow-thinking";
    if (reaction === "shake" || reaction === "frown") return "reaction-glow-negative";
    return "";
  };

  const displayReaction = isSpeaking ? "speaking" as ReactionType : reaction;

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-end overflow-hidden cursor-pointer transition-all duration-200 frosted-glass h-full
        ${isActive ? "ring-2 ring-blue-400" : "ring-1 ring-white/10"}
        ${getReactionGlowClass()}
        bg-gradient-to-b from-[#2a2a4a]/60 to-[#1a1a2e]/60 hover:from-[#32325a]/70 hover:to-[#22223a]/70`}
      style={{ borderRadius: 8, minHeight: 160 }}
    >
      {/* Avatar */}
      <div className="animate-breathe mt-2 flex-1 flex items-end">
        <MiiAvatar persona={persona} size={110} reaction={displayReaction} showReactionEmoji={reactionEmoji} />
      </div>

      {/* Name bar */}
      <div className="w-full flex items-center justify-between px-2 py-1.5 bg-black/40 text-white text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate font-medium">{persona.name}</span>
          {isSpeaking && (
            <div className="flex gap-0.5 items-end h-3 flex-shrink-0">
              <span className="w-0.5 bg-cyan-400 rounded-full animate-sound-bar-1" style={{ height: "40%" }} />
              <span className="w-0.5 bg-cyan-400 rounded-full animate-sound-bar-2" style={{ height: "70%" }} />
              <span className="w-0.5 bg-cyan-400 rounded-full animate-sound-bar-3" style={{ height: "50%" }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isMuted && !isSpeaking && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" fill="#ef4444" />
              <line x1="2" y1="2" x2="14" y2="14" stroke="#ef4444" strokeWidth="2" />
            </svg>
          )}
          <span className="text-[10px] text-white/50">{persona.profession}</span>
        </div>
      </div>

      {/* Thinking indicator */}
      {reaction === "think" && !isSpeaking && (
        <div className="absolute top-2 left-2 flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot-3" />
        </div>
      )}
    </div>
  );
}
