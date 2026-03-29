import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import { SessionTheme } from "../data/themes";

interface ThemedLayoutProps {
  theme: SessionTheme;
  children: ReactNode[];
  selfViewTile: ReactNode;
}

export function ThemedLayout({ theme, children, selfViewTile }: ThemedLayoutProps) {
  const totalTiles = children.length + 1; // +1 for self-view

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const tileVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 200, damping: 20 },
    },
  };

  switch (theme.tileLayout) {
    case "panel":
      return (
        <PanelLayout
          containerVariants={containerVariants}
          tileVariants={tileVariants}
          selfViewTile={selfViewTile}
        >
          {children}
        </PanelLayout>
      );
    case "semicircle":
      return (
        <SemicircleLayout
          containerVariants={containerVariants}
          tileVariants={tileVariants}
          selfViewTile={selfViewTile}
          totalTiles={totalTiles}
        >
          {children}
        </SemicircleLayout>
      );
    case "theater":
      return (
        <TheaterLayout
          containerVariants={containerVariants}
          tileVariants={tileVariants}
          selfViewTile={selfViewTile}
        >
          {children}
        </TheaterLayout>
      );
    default:
      return (
        <GridLayout
          containerVariants={containerVariants}
          tileVariants={tileVariants}
          selfViewTile={selfViewTile}
          totalTiles={totalTiles}
        >
          {children}
        </GridLayout>
      );
  }
}

interface LayoutProps {
  children: ReactNode[];
  selfViewTile: ReactNode;
  containerVariants: Variants;
  tileVariants: Variants;
  totalTiles?: number;
}

// Shark Tank: panel of judges in a row at top, user below
function PanelLayout({ children, selfViewTile, containerVariants, tileVariants }: LayoutProps) {
  return (
    <motion.div
      className="h-full flex flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Judges row */}
      <div className="flex-1 flex gap-3 items-stretch">
        {children.map((child, i) => (
          <motion.div
            key={i}
            className="flex-1"
            variants={tileVariants}
            layout
          >
            {child}
          </motion.div>
        ))}
      </div>
      {/* User's self-view at bottom, smaller */}
      <motion.div
        className="h-[30%] max-h-[200px]"
        variants={tileVariants}
        layout
      >
        {selfViewTile}
      </motion.div>
    </motion.div>
  );
}

// Courtroom: semicircle jury arc with user at bottom center
function SemicircleLayout({ children, selfViewTile, containerVariants, tileVariants, totalTiles = 7 }: LayoutProps) {
  const audienceCount = children.length;
  return (
    <motion.div
      className="h-full relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Jury arc */}
      {children.map((child, i) => {
        // Spread personas in a semicircle arc at the top
        const angleRange = Math.min(140, audienceCount * 25);
        const startAngle = (180 - angleRange) / 2;
        const angle = startAngle + (angleRange / Math.max(1, audienceCount - 1)) * i;
        const radian = (angle * Math.PI) / 180;

        // Position along an elliptical arc
        const radiusX = 38;
        const radiusY = 30;
        const centerX = 50;
        const centerY = 55;

        const x = centerX - radiusX * Math.cos(radian);
        const y = centerY - radiusY * Math.sin(radian);

        // Scale based on position (center larger)
        const distFromCenter = Math.abs(i - (audienceCount - 1) / 2) / Math.max(1, (audienceCount - 1) / 2);
        const scale = 1 - distFromCenter * 0.1;

        const tileWidth = Math.min(220, Math.max(140, 800 / audienceCount));
        const tileHeight = tileWidth * 0.75;

        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              width: tileWidth,
              height: tileHeight,
            }}
            variants={tileVariants}
            layout
          >
            {child}
          </motion.div>
        );
      })}

      {/* User self-view at bottom center */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 200, height: 150 }}
        variants={tileVariants}
        layout
      >
        {selfViewTile}
      </motion.div>
    </motion.div>
  );
}

// Lecture hall: theater rows with perspective, back rows smaller
function TheaterLayout({ children, selfViewTile, containerVariants, tileVariants }: LayoutProps) {
  const audienceCount = children.length;
  const rowSize = Math.ceil(audienceCount / 2);
  const frontRow = children.slice(0, rowSize);
  const backRow = children.slice(rowSize);

  return (
    <motion.div
      className="h-full flex flex-col gap-2 justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back row (smaller, dimmer - farther away) */}
      {backRow.length > 0 && (
        <div className="flex gap-2 items-stretch px-8 opacity-80" style={{ flex: "0 0 28%" }}>
          {backRow.map((child, i) => (
            <motion.div
              key={`back-${i}`}
              className="flex-1"
              style={{ transform: "scale(0.9)" }}
              variants={tileVariants}
              layout
            >
              {child}
            </motion.div>
          ))}
        </div>
      )}

      {/* Front row (larger, brighter - closer) */}
      <div className="flex gap-3 items-stretch" style={{ flex: "0 0 38%" }}>
        {frontRow.map((child, i) => (
          <motion.div
            key={`front-${i}`}
            className="flex-1"
            variants={tileVariants}
            layout
          >
            {child}
          </motion.div>
        ))}
      </div>

      {/* User self-view at bottom */}
      <motion.div
        className="max-h-[180px]"
        style={{ flex: "0 0 25%" }}
        variants={tileVariants}
        layout
      >
        {selfViewTile}
      </motion.div>
    </motion.div>
  );
}

// Default grid: standard Zoom-style grid
function GridLayout({ children, selfViewTile, containerVariants, tileVariants, totalTiles = 7 }: LayoutProps) {
  const gridCols =
    totalTiles <= 2
      ? "grid-cols-2"
      : totalTiles <= 4
      ? "grid-cols-2"
      : totalTiles <= 6
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <motion.div
      className={`grid ${gridCols} gap-3 h-full`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={tileVariants} layout>
        {selfViewTile}
      </motion.div>
      {children.map((child, i) => (
        <motion.div key={i} variants={tileVariants} layout>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
