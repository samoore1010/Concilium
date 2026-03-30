export interface Exercise {
  id: string;
  scriptId: string;
  type: "read-aloud" | "pace-match" | "no-fillers" | "emphasis" | "free-delivery";
  title: string;
  instruction: string;
  targets: ProsodyTargets;
  starThresholds: [number, number, number]; // scores needed for 1, 2, 3 stars
  xpReward: number;
}

export interface ProsodyTargets {
  wpmRange?: [number, number];
  maxFillerWords?: number;
  minVolumeVariation?: number;
  minPitchVariation?: number;
  minEnergy?: number;
  maxSilenceRatio?: number;
  minVolume?: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  exercises: Exercise[];
  unlockRequirement: number; // total stars needed from previous lessons
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: Lesson[];
}

export const UNITS: Unit[] = [
  {
    id: "foundations",
    title: "Foundations",
    description: "Master the basics of clear, steady delivery",
    icon: "🎯",
    color: "#3b82f6",
    lessons: [
      {
        id: "f1", unitId: "foundations", title: "Find Your Pace", description: "Learn to speak at a steady, natural pace",
        unlockRequirement: 0,
        exercises: [
          { id: "f1e1", scriptId: "b2", type: "read-aloud", title: "Warm Up", instruction: "Read this introduction at a comfortable pace. Focus on being steady, not fast.", targets: { wpmRange: [100, 140] }, starThresholds: [40, 65, 85], xpReward: 15 },
          { id: "f1e2", scriptId: "b5", type: "pace-match", title: "Pace Control", instruction: "Try to match the target pace of 125 words per minute. The meter will show if you're too fast or too slow.", targets: { wpmRange: [115, 135] }, starThresholds: [45, 70, 88], xpReward: 20 },
          { id: "f1e3", scriptId: "b1", type: "read-aloud", title: "The Pitch", instruction: "Deliver this elevator pitch at a confident, measured pace.", targets: { wpmRange: [120, 140], minEnergy: 25 }, starThresholds: [50, 72, 90], xpReward: 25 },
        ],
      },
      {
        id: "f2", unitId: "foundations", title: "Speak Up", description: "Project your voice with confidence",
        unlockRequirement: 3,
        exercises: [
          { id: "f2e1", scriptId: "b4", type: "read-aloud", title: "Volume Check", instruction: "Read this thank-you speech. Focus on projecting your voice clearly.", targets: { minVolume: 30, wpmRange: [105, 130] }, starThresholds: [40, 65, 85], xpReward: 15 },
          { id: "f2e2", scriptId: "b3", type: "read-aloud", title: "Clear Explanation", instruction: "Explain this topic with clear, confident volume. Imagine the back row needs to hear you.", targets: { minVolume: 35, minVolumeVariation: 15 }, starThresholds: [45, 70, 88], xpReward: 20 },
          { id: "f2e3", scriptId: "b1", type: "read-aloud", title: "Command the Room", instruction: "Deliver this pitch like you own the room. Strong, clear, no mumbling.", targets: { minVolume: 40, minEnergy: 30, wpmRange: [120, 145] }, starThresholds: [50, 72, 90], xpReward: 25 },
        ],
      },
      {
        id: "f3", unitId: "foundations", title: "Kill the Fillers", description: "Eliminate ums, uhs, and likes",
        unlockRequirement: 6,
        exercises: [
          { id: "f3e1", scriptId: "b5", type: "no-fillers", title: "Clean Read", instruction: "Read this product overview without any filler words. Zero ums, zero uhs, zero likes.", targets: { maxFillerWords: 2, wpmRange: [110, 140] }, starThresholds: [40, 65, 85], xpReward: 20 },
          { id: "f3e2", scriptId: "b2", type: "no-fillers", title: "Filler-Free Intro", instruction: "Introduce yourself perfectly. Replace every urge to say 'um' with a brief pause instead.", targets: { maxFillerWords: 1, wpmRange: [110, 135] }, starThresholds: [50, 72, 90], xpReward: 25 },
          { id: "f3e3", scriptId: "i1", type: "no-fillers", title: "Clean Pitch", instruction: "Deliver this longer pitch with zero filler words. Pauses are fine — fillers are not.", targets: { maxFillerWords: 0, wpmRange: [120, 145] }, starThresholds: [55, 75, 92], xpReward: 30 },
        ],
      },
    ],
  },
  {
    id: "expression",
    title: "Expression",
    description: "Add life and emotion to your delivery",
    icon: "🎭",
    color: "#8b5cf6",
    lessons: [
      {
        id: "e1", unitId: "expression", title: "Break the Monotone", description: "Vary your pitch to keep listeners engaged",
        unlockRequirement: 9,
        exercises: [
          { id: "e1e1", scriptId: "b4", type: "emphasis", title: "Warm Words", instruction: "Read this with genuine warmth. Let your pitch rise on exciting words and drop on serious ones.", targets: { minPitchVariation: 20, minVolumeVariation: 20 }, starThresholds: [40, 65, 85], xpReward: 20 },
          { id: "e1e2", scriptId: "i3", type: "emphasis", title: "Storyteller", instruction: "Tell this story with expression. Build energy toward the punchline.", targets: { minPitchVariation: 25, minEnergy: 35 }, starThresholds: [45, 70, 88], xpReward: 25 },
          { id: "e1e3", scriptId: "i1", type: "emphasis", title: "Passionate Pitch", instruction: "Deliver this investment ask with conviction. Vary your tone to emphasize the big numbers and key points.", targets: { minPitchVariation: 30, minVolumeVariation: 25, minEnergy: 40 }, starThresholds: [50, 72, 90], xpReward: 30 },
        ],
      },
      {
        id: "e2", unitId: "expression", title: "The Power of Pauses", description: "Use silence as a tool",
        unlockRequirement: 12,
        exercises: [
          { id: "e2e1", scriptId: "i2", type: "emphasis", title: "Dramatic Beats", instruction: "Read this opening statement. Pause for 2 seconds after each key point. Let the words land.", targets: { maxSilenceRatio: 35, minPitchVariation: 20 }, starThresholds: [40, 65, 85], xpReward: 25 },
          { id: "e2e2", scriptId: "i3", type: "emphasis", title: "Build Suspense", instruction: "Deliver this keynote opening with strategic pauses before the reveals.", targets: { minPitchVariation: 25, minEnergy: 30 }, starThresholds: [50, 72, 90], xpReward: 30 },
        ],
      },
    ],
  },
  {
    id: "mastery",
    title: "Mastery",
    description: "Advanced delivery techniques for high-stakes moments",
    icon: "🏆",
    color: "#f59e0b",
    lessons: [
      {
        id: "m1", unitId: "mastery", title: "Under Pressure", description: "Maintain composure during tough deliveries",
        unlockRequirement: 18,
        exercises: [
          { id: "m1e1", scriptId: "a1", type: "read-aloud", title: "Crisis Mode", instruction: "Deliver this crisis communication with calm authority. Steady pace, clear voice, no panic.", targets: { wpmRange: [110, 130], minVolume: 35, maxFillerWords: 1, minEnergy: 30 }, starThresholds: [50, 72, 90], xpReward: 35 },
          { id: "m1e2", scriptId: "a2", type: "emphasis", title: "Closing Argument", instruction: "Deliver this closing argument. Build emotion gradually. Let the jury feel every word.", targets: { minPitchVariation: 30, minVolumeVariation: 30, minEnergy: 45, maxFillerWords: 0 }, starThresholds: [55, 75, 92], xpReward: 40 },
          { id: "m1e3", scriptId: "a3", type: "emphasis", title: "Visionary", instruction: "Deliver this visionary pitch with maximum impact. Energy, expression, conviction — everything.", targets: { minPitchVariation: 35, minVolumeVariation: 30, minEnergy: 50, maxFillerWords: 0, wpmRange: [120, 140] }, starThresholds: [60, 78, 95], xpReward: 50 },
        ],
      },
    ],
  },
];

export function getAllExercises(): Exercise[] {
  return UNITS.flatMap((u) => u.lessons.flatMap((l) => l.exercises));
}

export function getExerciseById(id: string): { exercise: Exercise; lesson: Lesson; unit: Unit } | undefined {
  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      const exercise = lesson.exercises.find((e) => e.id === id);
      if (exercise) return { exercise, lesson, unit };
    }
  }
  return undefined;
}
