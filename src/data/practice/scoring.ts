import { ProsodyTargets } from "./lessons";
import { ProsodyMetrics } from "../../hooks/useProsody";

export interface DeliveryScore {
  overall: number;        // 0-100
  pace: number;           // 0-100
  volume: number;         // 0-100
  expression: number;     // 0-100
  fillers: number;        // 0-100
  energy: number;         // 0-100
  stars: number;          // 1-3
  xpEarned: number;
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  metric: string;
  score: number;
  label: string;
  feedback: string;
}

export function calculateDeliveryScore(
  prosody: ProsodyMetrics,
  speechMetrics: { wordsPerMinute: number; fillerWordCount: number; vocabularyScore: number },
  targets: ProsodyTargets,
  starThresholds: [number, number, number],
  xpReward: number,
  durationSeconds: number
): DeliveryScore {
  const breakdown: ScoreBreakdown[] = [];

  // === PACE SCORE ===
  let paceScore = 100;
  if (targets.wpmRange) {
    const [lo, hi] = targets.wpmRange;
    const wpm = speechMetrics.wordsPerMinute;
    if (wpm >= lo && wpm <= hi) {
      paceScore = 100;
    } else if (wpm < lo) {
      paceScore = Math.max(0, 100 - (lo - wpm) * 3);
    } else {
      paceScore = Math.max(0, 100 - (wpm - hi) * 3);
    }
  }
  breakdown.push({
    metric: "Pace",
    score: Math.round(paceScore),
    label: targets.wpmRange ? `${speechMetrics.wordsPerMinute} WPM (target: ${targets.wpmRange[0]}-${targets.wpmRange[1]})` : `${speechMetrics.wordsPerMinute} WPM`,
    feedback: paceScore >= 80 ? "Great pace!" : paceScore >= 50 ? "Close to target — small adjustment needed" : speechMetrics.wordsPerMinute < (targets.wpmRange?.[0] || 120) ? "Try to speed up a bit" : "Slow down — you're rushing",
  });

  // === VOLUME SCORE ===
  let volumeScore = 70; // default
  if (targets.minVolume !== undefined) {
    volumeScore = prosody.averageVolume >= targets.minVolume ? Math.min(100, 70 + (prosody.averageVolume - targets.minVolume)) : Math.max(0, (prosody.averageVolume / targets.minVolume) * 70);
  }
  if (targets.minVolumeVariation !== undefined) {
    const varScore = prosody.volumeVariation >= targets.minVolumeVariation ? 100 : (prosody.volumeVariation / targets.minVolumeVariation) * 100;
    volumeScore = (volumeScore + varScore) / 2;
  }
  breakdown.push({
    metric: "Volume",
    score: Math.round(volumeScore),
    label: `Avg: ${prosody.averageVolume}%, Variation: ${prosody.volumeVariation}%`,
    feedback: volumeScore >= 80 ? "Strong projection!" : prosody.averageVolume < 25 ? "Speak louder — project to the back row" : "Good volume, try varying it more for emphasis",
  });

  // === EXPRESSION SCORE ===
  let expressionScore = 60;
  if (targets.minPitchVariation !== undefined) {
    expressionScore = prosody.pitchVariation >= targets.minPitchVariation ? Math.min(100, 70 + (prosody.pitchVariation - targets.minPitchVariation)) : (prosody.pitchVariation / targets.minPitchVariation) * 70;
  }
  breakdown.push({
    metric: "Expression",
    score: Math.round(expressionScore),
    label: `Pitch variety: ${prosody.pitchVariation}%`,
    feedback: expressionScore >= 80 ? "Very expressive!" : expressionScore >= 50 ? "Good start — try emphasizing key words more" : "Too monotone — vary your pitch to keep listeners engaged",
  });

  // === FILLERS SCORE ===
  let fillerScore = 100;
  if (targets.maxFillerWords !== undefined) {
    const excess = Math.max(0, speechMetrics.fillerWordCount - targets.maxFillerWords);
    fillerScore = Math.max(0, 100 - excess * 25);
  } else {
    fillerScore = Math.max(0, 100 - speechMetrics.fillerWordCount * 10);
  }
  breakdown.push({
    metric: "Fillers",
    score: Math.round(fillerScore),
    label: `${speechMetrics.fillerWordCount} filler word${speechMetrics.fillerWordCount !== 1 ? "s" : ""} detected`,
    feedback: fillerScore >= 90 ? "Almost perfect — minimal fillers!" : fillerScore >= 60 ? "A few fillers — try replacing them with pauses" : "Too many fillers — practice pausing instead of saying 'um'",
  });

  // === ENERGY SCORE ===
  let energyScore = prosody.energyLevel;
  if (targets.minEnergy !== undefined) {
    energyScore = prosody.energyLevel >= targets.minEnergy ? Math.min(100, 70 + (prosody.energyLevel - targets.minEnergy)) : (prosody.energyLevel / targets.minEnergy) * 70;
  }
  breakdown.push({
    metric: "Energy",
    score: Math.round(energyScore),
    label: `Energy level: ${prosody.energyLevel}%`,
    feedback: energyScore >= 80 ? "Great energy!" : energyScore >= 50 ? "Decent energy — try building toward the end" : "Low energy — bring more enthusiasm and vocal presence",
  });

  // === OVERALL ===
  const weights = { pace: 0.25, volume: 0.2, expression: 0.2, fillers: 0.2, energy: 0.15 };
  const overall = Math.round(
    paceScore * weights.pace +
    volumeScore * weights.volume +
    expressionScore * weights.expression +
    fillerScore * weights.fillers +
    energyScore * weights.energy
  );

  const stars = overall >= starThresholds[2] ? 3 : overall >= starThresholds[1] ? 2 : overall >= starThresholds[0] ? 1 : 0;
  const xpEarned = Math.round((xpReward * stars) / 3);

  return {
    overall,
    pace: Math.round(paceScore),
    volume: Math.round(volumeScore),
    expression: Math.round(expressionScore),
    fillers: Math.round(fillerScore),
    energy: Math.round(energyScore),
    stars,
    xpEarned,
    breakdown,
  };
}
