export interface ExerciseResult {
  exerciseId: string;
  stars: number;
  score: number;
  xpEarned: number;
  date: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (progress: UserProgress) => boolean;
}

export interface UserProgress {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  exerciseResults: Record<string, ExerciseResult>; // best result per exercise
  totalExercisesCompleted: number;
  totalStars: number;
  achievements: string[]; // unlocked achievement IDs
}

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000];

export const LEVEL_NAMES = [
  "Novice", "Beginner", "Apprentice", "Intermediate", "Confident",
  "Skilled", "Advanced", "Expert", "Master", "Grandmaster", "Legend",
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-lesson", title: "First Steps", description: "Complete your first exercise", icon: "👣", condition: (p) => p.totalExercisesCompleted >= 1 },
  { id: "five-stars", title: "Rising Star", description: "Earn 5 total stars", icon: "⭐", condition: (p) => p.totalStars >= 5 },
  { id: "fifteen-stars", title: "Star Collector", description: "Earn 15 total stars", icon: "🌟", condition: (p) => p.totalStars >= 15 },
  { id: "thirty-stars", title: "Constellation", description: "Earn 30 total stars", icon: "✨", condition: (p) => p.totalStars >= 30 },
  { id: "sixty-stars", title: "Galaxy", description: "Earn 60 total stars", icon: "🌌", condition: (p) => p.totalStars >= 60 },
  { id: "perfect-score", title: "Flawless", description: "Get 3 stars on any exercise", icon: "💎", condition: (p) => Object.values(p.exerciseResults).some((r) => r.stars === 3) },
  { id: "no-fillers", title: "Clean Speaker", description: "Complete an exercise with zero filler words", icon: "🧹", condition: (p) => p.totalExercisesCompleted >= 1 }, // checked separately
  { id: "streak-3", title: "Consistent", description: "Practice 3 days in a row", icon: "🔥", condition: (p) => p.currentStreak >= 3 },
  { id: "streak-7", title: "Dedicated", description: "Practice 7 days in a row", icon: "🔥", condition: (p) => p.currentStreak >= 7 },
  { id: "streak-30", title: "Unstoppable", description: "Practice 30 days in a row", icon: "🔥", condition: (p) => p.currentStreak >= 30 },
  { id: "level-5", title: "Confident Speaker", description: "Reach level 5", icon: "🎤", condition: (p) => p.level >= 5 },
  { id: "level-10", title: "Master Presenter", description: "Reach level 10", icon: "👑", condition: (p) => p.level >= 10 },
  { id: "xp-1000", title: "Thousand Club", description: "Earn 1,000 total XP", icon: "💪", condition: (p) => p.totalXP >= 1000 },
  { id: "persuader", title: "Persuader", description: "Complete all Opening Hooks exercises", icon: "🎣", condition: (p) => ["p1e1", "p1e2", "p1e3"].every((id) => p.exerciseResults[id]) },
  { id: "closer", title: "The Closer", description: "Complete all Closing Strong exercises", icon: "🏁", condition: (p) => ["p3e1", "p3e2", "p3e3"].every((id) => p.exerciseResults[id]) },
  { id: "all-rounder", title: "All-Rounder", description: "Complete at least one exercise in every unit", icon: "🌍", condition: (p) => {
    const ids = Object.keys(p.exerciseResults);
    return ids.some((id) => id.startsWith("f")) && ids.some((id) => id.startsWith("e")) && ids.some((id) => id.startsWith("m")) && ids.some((id) => id.startsWith("p"));
  }},
];

const STORAGE_KEY = "concilium-practice-progress";

function getDefaultProgress(): UserProgress {
  return {
    totalXP: 0,
    level: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: "",
    exerciseResults: {},
    totalExercisesCompleted: 0,
    totalStars: 0,
    achievements: [],
  };
}

export function loadProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return getDefaultProgress();
}

export function saveProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export function recordExercise(
  progress: UserProgress,
  exerciseId: string,
  stars: number,
  score: number,
  xpEarned: number
): { progress: UserProgress; newAchievements: Achievement[] } {
  const updated = { ...progress };

  // Only update if this is a better result
  const prev = updated.exerciseResults[exerciseId];
  const isNew = !prev;
  const isBetter = prev && stars > prev.stars;

  if (isNew || isBetter) {
    const prevXP = prev?.xpEarned || 0;
    const prevStars = prev?.stars || 0;

    updated.exerciseResults[exerciseId] = { exerciseId, stars, score, xpEarned, date: Date.now() };
    updated.totalXP += xpEarned - prevXP;
    updated.totalStars += stars - prevStars;
    if (isNew) updated.totalExercisesCompleted += 1;
  }

  // Update streak
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (updated.lastPracticeDate === yesterday) {
    updated.currentStreak += 1;
  } else if (updated.lastPracticeDate !== today) {
    updated.currentStreak = 1;
  }
  updated.lastPracticeDate = today;
  updated.longestStreak = Math.max(updated.longestStreak, updated.currentStreak);

  // Update level
  updated.level = LEVEL_THRESHOLDS.findIndex((t, i) =>
    i === LEVEL_THRESHOLDS.length - 1 || updated.totalXP < LEVEL_THRESHOLDS[i + 1]
  );

  // Check achievements
  const newAchievements: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!updated.achievements.includes(ach.id) && ach.condition(updated)) {
      updated.achievements.push(ach.id);
      newAchievements.push(ach);
    }
  }

  saveProgress(updated);
  return { progress: updated, newAchievements };
}

export function getLevelProgress(progress: UserProgress): { current: number; next: number; percent: number } {
  const current = LEVEL_THRESHOLDS[progress.level] || 0;
  const next = LEVEL_THRESHOLDS[progress.level + 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const percent = next > current ? ((progress.totalXP - current) / (next - current)) * 100 : 100;
  return { current, next, percent: Math.min(100, percent) };
}
