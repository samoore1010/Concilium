import { useEffect, useState } from "react";
import { Persona, ReactionType } from "../data/personas";

interface MiiAvatarProps {
  persona: Persona;
  size?: number;
  reaction?: ReactionType;
  showReactionEmoji?: string;
}

export function MiiAvatar({ persona, size = 120, reaction = "neutral", showReactionEmoji }: MiiAvatarProps) {
  const [animClass, setAnimClass] = useState("");
  const [bodyAnimClass, setBodyAnimClass] = useState("");
  const [mouthShape, setMouthShape] = useState<"neutral" | "smile" | "frown" | "open">("neutral");
  const [breatheClass, setBreathaClass] = useState("animate-breathe");
  const [eyeOffset, setEyeOffset] = useState(0);

  useEffect(() => {
    // Eye tracking animation
    const eyeInterval = setInterval(() => {
      setEyeOffset((Math.random() - 0.5) * 4);
    }, 3000);
    return () => clearInterval(eyeInterval);
  }, []);

  useEffect(() => {
    switch (reaction) {
      case "nod":
        setAnimClass("animate-nod");
        setBodyAnimClass("animate-lean-forward");
        setMouthShape("smile");
        setBreathaClass("animate-breathe-fast");
        break;
      case "smile":
        setAnimClass("");
        setBodyAnimClass("");
        setMouthShape("smile");
        setBreathaClass("animate-breathe-fast");
        break;
      case "shake":
        setAnimClass("animate-shake-head");
        setBodyAnimClass("");
        setMouthShape("frown");
        setBreathaClass("animate-breathe-slow");
        break;
      case "frown":
        setAnimClass("");
        setBodyAnimClass("");
        setMouthShape("frown");
        setBreathaClass("animate-breathe-slow");
        break;
      case "think":
        setAnimClass("");
        setBodyAnimClass("animate-lean-back");
        setMouthShape("neutral");
        setBreathaClass("animate-breathe");
        break;
      case "raised-hand":
        setAnimClass("");
        setBodyAnimClass("");
        setMouthShape("open");
        setBreathaClass("animate-breathe");
        break;
      case "speaking":
        setAnimClass("");
        setBodyAnimClass("animate-lean-forward");
        setMouthShape("open");
        setBreathaClass("animate-breathe-fast");
        break;
      default:
        setAnimClass("");
        setBodyAnimClass("");
        setMouthShape("neutral");
        setBreathaClass("animate-breathe");
    }
    const timer = setTimeout(() => setAnimClass(""), 1000);
    return () => clearTimeout(timer);
  }, [reaction]);

  const s = size;
  const cx = s / 2;
  const headR = s * 0.32;
  const eyeY = s * 0.38;
  const eyeSpacing = s * 0.1;
  const mouthY = s * 0.52;
  const bodyY = s * 0.68;

  const renderHair = () => {
    const hairProps = { fill: persona.hairColor };
    switch (persona.hairStyle) {
      case "long":
        return (
          <>
            <ellipse cx={cx} cy={s * 0.28} rx={headR + 4} ry={headR + 2} {...hairProps} />
            <rect x={cx - headR - 3} y={s * 0.28} width={8} height={s * 0.28} rx={4} {...hairProps} />
            <rect x={cx + headR - 5} y={s * 0.28} width={8} height={s * 0.28} rx={4} {...hairProps} />
          </>
        );
      case "curly":
        return (
          <>
            <ellipse cx={cx} cy={s * 0.25} rx={headR + 6} ry={headR + 4} {...hairProps} />
            <circle cx={cx - headR} cy={s * 0.22} r={6} {...hairProps} />
            <circle cx={cx + headR} cy={s * 0.22} r={6} {...hairProps} />
            <circle cx={cx - headR + 8} cy={s * 0.16} r={5} {...hairProps} />
            <circle cx={cx + headR - 8} cy={s * 0.16} r={5} {...hairProps} />
          </>
        );
      case "bob":
        return (
          <>
            <ellipse cx={cx} cy={s * 0.27} rx={headR + 5} ry={headR + 1} {...hairProps} />
            <rect x={cx - headR - 4} y={s * 0.27} width={headR * 2 + 8} height={s * 0.15} rx={6} {...hairProps} />
          </>
        );
      case "bald":
        return null;
      case "ponytail":
        return (
          <>
            <ellipse cx={cx} cy={s * 0.27} rx={headR + 3} ry={headR + 1} {...hairProps} />
            <ellipse cx={cx + headR + 6} cy={s * 0.2} rx={5} ry={10} {...hairProps} />
          </>
        );
      case "short":
      default:
        return <ellipse cx={cx} cy={s * 0.27} rx={headR + 3} ry={headR} {...hairProps} />;
    }
  };

  const renderAccessory = () => {
    switch (persona.accessory) {
      case "glasses":
        return (
          <g stroke="#333" strokeWidth={1.5} fill="none">
            <circle cx={cx - eyeSpacing} cy={eyeY} r={7} />
            <circle cx={cx + eyeSpacing} cy={eyeY} r={7} />
            <line x1={cx - eyeSpacing + 7} y1={eyeY} x2={cx + eyeSpacing - 7} y2={eyeY} />
            <line x1={cx - eyeSpacing - 7} y1={eyeY} x2={cx - eyeSpacing - 12} y2={eyeY - 3} />
            <line x1={cx + eyeSpacing + 7} y1={eyeY} x2={cx + eyeSpacing + 12} y2={eyeY - 3} />
          </g>
        );
      case "earrings":
        return (
          <>
            <circle cx={cx - headR - 2} cy={s * 0.42} r={3} fill="#ffd700" />
            <circle cx={cx + headR + 2} cy={s * 0.42} r={3} fill="#ffd700" />
          </>
        );
      case "hat":
        return (
          <>
            <rect x={cx - headR - 6} y={s * 0.15} width={headR * 2 + 12} height={8} rx={2} fill="#4a3728" />
            <rect x={cx - headR + 4} y={s * 0.08} width={headR * 2 - 8} height={12} rx={4} fill="#5c4033" />
          </>
        );
      case "bowtie":
        return (
          <g fill="#c0392b">
            <polygon points={`${cx - 8},${bodyY - 2} ${cx},${bodyY + 2} ${cx - 8},${bodyY + 6}`} />
            <polygon points={`${cx + 8},${bodyY - 2} ${cx},${bodyY + 2} ${cx + 8},${bodyY + 6}`} />
            <circle cx={cx} cy={bodyY + 2} r={2} fill="#a0302a" />
          </g>
        );
      case "headscarf":
        return (
          <ellipse cx={cx} cy={s * 0.24} rx={headR + 8} ry={headR + 4} fill="#7c3aed" opacity={0.7} />
        );
      default:
        return null;
    }
  };

  const renderMouth = () => {
    if (reaction === "speaking") {
      // Animated speaking mouth
      return (
        <g className="animate-speaking-mouth" style={{ transformOrigin: `${cx}px ${mouthY + 2}px` }}>
          <ellipse cx={cx} cy={mouthY + 2} rx={5} ry={4} fill="#333" />
        </g>
      );
    }
    switch (mouthShape) {
      case "smile":
        return <path d={`M${cx - 8},${mouthY} Q${cx},${mouthY + 8} ${cx + 8},${mouthY}`} stroke="#333" strokeWidth={2} fill="none" />;
      case "frown":
        return <path d={`M${cx - 8},${mouthY + 4} Q${cx},${mouthY - 4} ${cx + 8},${mouthY + 4}`} stroke="#333" strokeWidth={2} fill="none" />;
      case "open":
        return <ellipse cx={cx} cy={mouthY + 2} rx={5} ry={4} fill="#333" />;
      default:
        return <line x1={cx - 7} y1={mouthY + 1} x2={cx + 7} y2={mouthY + 1} stroke="#333" strokeWidth={2} strokeLinecap="round" />;
    }
  };

  const renderArms = () => {
    const armBaseY = bodyY + s * 0.08;
    const armColor = persona.skinTone;

    switch (reaction) {
      case "raised-hand":
      case "speaking":
        // Right arm raised
        return (
          <>
            <ellipse cx={cx - s * 0.22} cy={armBaseY} rx={4} ry={s * 0.12} fill={armColor} />
            <ellipse cx={cx + s * 0.22} cy={armBaseY - s * 0.2} rx={4} ry={s * 0.15} fill={armColor} transform={`rotate(-45 ${cx + s * 0.22} ${armBaseY})`} />
          </>
        );
      case "shake":
      case "frown":
        // Crossed arms
        return (
          <>
            <ellipse cx={cx - s * 0.15} cy={armBaseY + s * 0.08} rx={4} ry={s * 0.1} fill={armColor} transform={`rotate(-20 ${cx - s * 0.15} ${armBaseY})`} />
            <ellipse cx={cx + s * 0.15} cy={armBaseY + s * 0.08} rx={4} ry={s * 0.1} fill={armColor} transform={`rotate(20 ${cx + s * 0.15} ${armBaseY})`} />
          </>
        );
      default:
        // Arms at sides
        return (
          <>
            <ellipse cx={cx - s * 0.22} cy={armBaseY} rx={4} ry={s * 0.12} fill={armColor} />
            <ellipse cx={cx + s * 0.22} cy={armBaseY} rx={4} ry={s * 0.12} fill={armColor} />
          </>
        );
    }
  };

  return (
    <div className={`relative ${animClass}`} style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Body */}
        <g className={bodyAnimClass}>
          <ellipse cx={cx} cy={bodyY + s * 0.18} rx={s * 0.3} ry={s * 0.22} fill={persona.shirtColor} />

          {/* Neck */}
          <rect x={cx - 6} y={s * 0.58} width={12} height={12} fill={persona.skinTone} />

          {/* Hair behind */}
          {renderHair()}

          {/* Head */}
          <ellipse cx={cx} cy={s * 0.36} rx={headR} ry={headR + 2} fill={persona.skinTone} />

          {/* Eyes with tracking */}
          <g className="animate-eye-blink" style={{ transformOrigin: `${cx}px ${eyeY}px` }}>
            <ellipse cx={cx - eyeSpacing + eyeOffset} cy={eyeY} rx={3.5} ry={4} fill="#333" />
            <ellipse cx={cx + eyeSpacing + eyeOffset} cy={eyeY} rx={3.5} ry={4} fill="#333" />
            <ellipse cx={cx - eyeSpacing + eyeOffset + 1} cy={eyeY - 1} rx={1.5} ry={1.5} fill="#fff" />
            <ellipse cx={cx + eyeSpacing + eyeOffset + 1} cy={eyeY - 1} rx={1.5} ry={1.5} fill="#fff" />
          </g>

        {/* Eyebrows */}
        <line
          x1={cx - eyeSpacing - 5}
          y1={eyeY - 8}
          x2={cx - eyeSpacing + 5}
          y2={eyeY - (reaction === "frown" || reaction === "shake" ? 6 : 9)}
          stroke="#333"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={cx + eyeSpacing - 5}
          y1={eyeY - (reaction === "frown" || reaction === "shake" ? 6 : 9)}
          x2={cx + eyeSpacing + 5}
          y2={eyeY - 8}
          stroke="#333"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Nose */}
        <path d={`M${cx},${s * 0.42} Q${cx + 3},${s * 0.47} ${cx},${s * 0.47}`} stroke="#c9a080" strokeWidth={1.5} fill="none" />

          {/* Mouth */}
          {renderMouth()}

          {/* Arms */}
          {renderArms()}

          {/* Accessory */}
          {renderAccessory()}
        </g>
      </svg>

      {/* Reaction emoji floating up */}
      {showReactionEmoji && (
        <div className="absolute -top-2 right-0 text-xl animate-float-up pointer-events-none">
          {showReactionEmoji}
        </div>
      )}
    </div>
  );
}
