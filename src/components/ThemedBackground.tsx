import { motion, AnimatePresence } from "framer-motion";
import { SessionTheme } from "../data/themes";

interface ThemedBackgroundProps {
  theme: SessionTheme;
}

export function ThemedBackground({ theme }: ThemedBackgroundProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={theme.id}
        className={`absolute inset-0 overflow-hidden pointer-events-none ${theme.backgroundClass}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Ambient effects layer */}
        <AmbientEffects theme={theme} />

        {/* Background decorative elements */}
        <BackgroundDecorations theme={theme} />

        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
      </motion.div>
    </AnimatePresence>
  );
}

function AmbientEffects({ theme }: { theme: SessionTheme }) {
  return (
    <>
      {theme.ambientEffects.map((effect, i) => {
        switch (effect.type) {
          case "spotlight-rays":
            return <SpotlightRays key={i} color={effect.color} intensity={effect.intensity} />;
          case "particles":
            return <FloatingParticles key={i} color={effect.color} intensity={effect.intensity} />;
          case "lens-flare":
            return <LensFlare key={i} color={effect.color} />;
          case "glow-pulse":
            return <GlowPulse key={i} color={effect.color} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function SpotlightRays({ color, intensity }: { color: string; intensity: string }) {
  const opacity = intensity === "medium" ? 0.15 : 0.08;
  return (
    <>
      {/* Main spotlight cone from top */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "60%",
          height: "70%",
          background: `conic-gradient(from 170deg at 50% 0%, transparent 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 45%, transparent 50%, transparent 80%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 87%, transparent 92%)`,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 1.5, ease: "easeOut" },
        }}
      />
      {/* Secondary softer spotlight */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "40%",
          height: "50%",
          background: `radial-gradient(ellipse at 50% 0%, ${color}22 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function FloatingParticles({ color, intensity }: { color: string; intensity: string }) {
  const count = intensity === "medium" ? 12 : 6;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            backgroundColor: color,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.4, 0],
            y: [-20, -60 - Math.random() * 40],
            x: [0, (Math.random() - 0.5) * 30],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

function LensFlare({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-[10%] left-1/2 -translate-x-1/2 rounded-full"
      style={{
        width: 120,
        height: 120,
        background: `radial-gradient(circle, ${color}30 0%, ${color}10 40%, transparent 70%)`,
      }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function GlowPulse({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: "60%",
        height: "60%",
        background: `radial-gradient(circle, ${color}15 0%, transparent 60%)`,
      }}
      animate={{
        scale: [0.9, 1.1, 0.9],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function BackgroundDecorations({ theme }: { theme: SessionTheme }) {
  return (
    <>
      {theme.backgroundElements.map((el, i) => {
        switch (el.type) {
          case "podium":
            return <PodiumDecoration key={i} color={theme.accentColor} />;
          case "bench":
            return <BenchDecoration key={i} color={theme.accentColor} />;
          case "lectern":
            return <LecternDecoration key={i} color={theme.accentColor} />;
          case "curtain":
            return <CurtainDecoration key={i} side={el.position as "left" | "right"} color={theme.accentColor} />;
          case "table":
            return <TableDecoration key={i} color={theme.accentColor} />;
          case "gavel":
            return <GavelDecoration key={i} color={theme.accentColor} />;
          case "screen":
            return <ScreenDecoration key={i} color={theme.accentColor} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function PodiumDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 0.3, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <svg width="160" height="100" viewBox="0 0 160 100" fill="none">
        <path d="M40 20 L120 20 L130 100 L30 100 Z" fill={color} opacity="0.2" />
        <path d="M50 0 L110 0 L115 20 L45 20 Z" fill={color} opacity="0.3" />
        <rect x="70" y="20" width="20" height="6" rx="1" fill={color} opacity="0.15" />
      </svg>
    </motion.div>
  );
}

function BenchDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-[2%] left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 0.25, y: 0 }}
      transition={{ duration: 1, delay: 0.3 }}
    >
      <svg width="300" height="60" viewBox="0 0 300 60" fill="none">
        <rect x="10" y="10" width="280" height="40" rx="4" fill={color} opacity="0.2" />
        <rect x="20" y="0" width="260" height="14" rx="3" fill={color} opacity="0.3" />
        <rect x="130" y="18" width="40" height="6" rx="1" fill={color} opacity="0.15" />
      </svg>
    </motion.div>
  );
}

function LecternDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute bottom-[5%] left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.25, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <svg width="80" height="120" viewBox="0 0 80 120" fill="none">
        <path d="M15 30 L65 30 L60 40 L20 40 Z" fill={color} opacity="0.3" />
        <rect x="30" y="40" width="20" height="70" fill={color} opacity="0.15" />
        <rect x="20" y="110" width="40" height="6" rx="2" fill={color} opacity="0.2" />
        <rect x="22" y="33" width="36" height="4" rx="1" fill={color} opacity="0.1" />
      </svg>
    </motion.div>
  );
}

function CurtainDecoration({ side, color }: { side: "left" | "right"; color: string }) {
  const isLeft = side === "left";
  return (
    <motion.div
      className={`absolute top-0 ${isLeft ? "left-0" : "right-0"} h-full`}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 0.2, x: 0 }}
      transition={{ duration: 1.2, delay: 0.2 }}
    >
      <svg width="60" height="100%" viewBox="0 0 60 600" preserveAspectRatio="none" fill="none">
        <path
          d={isLeft
            ? "M0 0 C20 100 10 200 25 300 C10 400 20 500 0 600 L0 0Z"
            : "M60 0 C40 100 50 200 35 300 C50 400 40 500 60 600 L60 0Z"}
          fill={color}
          opacity="0.15"
        />
      </svg>
    </motion.div>
  );
}

function TableDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.15, scale: 1 }}
      transition={{ duration: 1, delay: 0.4 }}
    >
      <svg width="400" height="100" viewBox="0 0 400 100" fill="none">
        <ellipse cx="200" cy="50" rx="180" ry="35" fill={color} opacity="0.2" />
        <ellipse cx="200" cy="50" rx="160" ry="28" fill="black" opacity="0.3" />
      </svg>
    </motion.div>
  );
}

function GavelDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-[6%] right-[25%]"
      initial={{ opacity: 0, rotate: -20 }}
      animate={{ opacity: 0.2, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="15" y="5" width="20" height="8" rx="2" fill={color} opacity="0.4" />
        <rect x="22" y="10" width="6" height="20" rx="1" fill={color} opacity="0.3" />
        <rect x="10" y="30" width="30" height="4" rx="1" fill={color} opacity="0.2" />
      </svg>
    </motion.div>
  );
}

function ScreenDecoration({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute top-[3%] left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 0.2, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <svg width="200" height="40" viewBox="0 0 200 40" fill="none">
        <rect x="10" y="5" width="180" height="25" rx="3" fill={color} opacity="0.2" />
        <rect x="90" y="30" width="20" height="8" fill={color} opacity="0.15" />
      </svg>
    </motion.div>
  );
}
