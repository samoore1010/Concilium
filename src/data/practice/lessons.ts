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
      {
        id: "e3", unitId: "expression", title: "Storytelling", description: "Use narrative to connect with your audience",
        unlockRequirement: 15,
        exercises: [
          { id: "e3e1", scriptId: "i7", type: "emphasis", title: "Paint a Picture", instruction: "Tell Sarah's story with genuine emotion. Slow down on the key details, speed up on the urgency.", targets: { minPitchVariation: 25, minVolumeVariation: 20, minEnergy: 30 }, starThresholds: [40, 65, 85], xpReward: 25 },
          { id: "e3e2", scriptId: "i3", type: "emphasis", title: "The Arc", instruction: "Build this keynote like a story: setup, tension, payoff. Your voice should mirror the emotional arc.", targets: { minPitchVariation: 30, minVolumeVariation: 25, minEnergy: 35 }, starThresholds: [45, 70, 88], xpReward: 30 },
          { id: "e3e3", scriptId: "i7", type: "free-delivery", title: "Make It Personal", instruction: "Deliver this story as if Sarah called you personally. Make the audience feel it. Full expression, natural pace.", targets: { minPitchVariation: 30, minEnergy: 40, minVolumeVariation: 25, wpmRange: [105, 135] }, starThresholds: [50, 72, 90], xpReward: 35 },
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
        unlockRequirement: 21,
        exercises: [
          { id: "m1e1", scriptId: "a1", type: "read-aloud", title: "Crisis Mode", instruction: "Deliver this crisis communication with calm authority. Steady pace, clear voice, no panic.", targets: { wpmRange: [110, 130], minVolume: 35, maxFillerWords: 1, minEnergy: 30 }, starThresholds: [50, 72, 90], xpReward: 35 },
          { id: "m1e2", scriptId: "a2", type: "emphasis", title: "Closing Argument", instruction: "Deliver this closing argument. Build emotion gradually. Let the jury feel every word.", targets: { minPitchVariation: 30, minVolumeVariation: 30, minEnergy: 45, maxFillerWords: 0 }, starThresholds: [55, 75, 92], xpReward: 40 },
          { id: "m1e3", scriptId: "a3", type: "emphasis", title: "Visionary", instruction: "Deliver this visionary pitch with maximum impact. Energy, expression, conviction — everything.", targets: { minPitchVariation: 35, minVolumeVariation: 30, minEnergy: 50, maxFillerWords: 0, wpmRange: [120, 140] }, starThresholds: [60, 78, 95], xpReward: 50 },
        ],
      },
      {
        id: "m2", unitId: "mastery", title: "Technical Authority", description: "Explain complex topics with clarity and confidence",
        unlockRequirement: 24,
        exercises: [
          { id: "m2e1", scriptId: "a6", type: "read-aloud", title: "Simplify It", instruction: "Explain this technical concept clearly. Steady pace, strong voice, zero jargon-stumbles.", targets: { wpmRange: [105, 125], minVolume: 35, maxFillerWords: 1, minEnergy: 25 }, starThresholds: [45, 70, 88], xpReward: 35 },
          { id: "m2e2", scriptId: "i4", type: "pace-match", title: "Research Authority", instruction: "Present these research findings at a measured, authoritative pace. Every number should land.", targets: { wpmRange: [110, 125], minVolume: 35, minPitchVariation: 20 }, starThresholds: [50, 72, 90], xpReward: 40 },
          { id: "m2e3", scriptId: "a6", type: "free-delivery", title: "Own the Room", instruction: "Deliver this technical explanation with full confidence. Clear, expressive, authoritative — the audience trusts you.", targets: { wpmRange: [105, 130], minVolume: 40, minPitchVariation: 25, minEnergy: 35, maxFillerWords: 0 }, starThresholds: [55, 75, 92], xpReward: 45 },
        ],
      },
    ],
  },
  {
    id: "persuasion",
    title: "Persuasion",
    description: "Win hearts and minds with strategic delivery",
    icon: "🎯",
    color: "#ef4444",
    lessons: [
      {
        id: "p1", unitId: "persuasion", title: "Opening Hooks", description: "Grab attention in the first 30 seconds",
        unlockRequirement: 30,
        exercises: [
          { id: "p1e1", scriptId: "i5", type: "emphasis", title: "The Hook", instruction: "Deliver this opening hook with energy. Your first sentence should make the audience lean in.", targets: { minPitchVariation: 25, minEnergy: 35, wpmRange: [115, 140] }, starThresholds: [45, 70, 88], xpReward: 30 },
          { id: "p1e2", scriptId: "i3", type: "emphasis", title: "Bold Opener", instruction: "Open this keynote with confidence. Start strong — pause — then build. Make them remember your first line.", targets: { minPitchVariation: 30, minEnergy: 40, minVolumeVariation: 25 }, starThresholds: [50, 72, 90], xpReward: 35 },
          { id: "p1e3", scriptId: "i5", type: "free-delivery", title: "Own Your Opening", instruction: "Deliver this hook as if you're on a stage in front of a thousand people. Full energy, total command, zero fillers.", targets: { minPitchVariation: 30, minEnergy: 45, minVolume: 40, maxFillerWords: 0, wpmRange: [115, 140] }, starThresholds: [55, 75, 92], xpReward: 40 },
        ],
      },
      {
        id: "p2", unitId: "persuasion", title: "Handling Objections", description: "Turn pushback into opportunity",
        unlockRequirement: 33,
        exercises: [
          { id: "p2e1", scriptId: "i6", type: "read-aloud", title: "Stay Calm", instruction: "Respond to this tough question with composure. Even pace, clear logic, no defensiveness.", targets: { wpmRange: [110, 130], minVolume: 35, maxFillerWords: 1 }, starThresholds: [45, 70, 88], xpReward: 30 },
          { id: "p2e2", scriptId: "a4", type: "emphasis", title: "The Reframe", instruction: "Reframe this objection with conviction. Acknowledge the concern, then pivot to your strongest argument.", targets: { minPitchVariation: 25, minEnergy: 35, minVolume: 35, maxFillerWords: 1 }, starThresholds: [50, 72, 90], xpReward: 35 },
          { id: "p2e3", scriptId: "a4", type: "free-delivery", title: "Turn the Table", instruction: "Deliver this objection response like a seasoned executive. Calm authority, persuasive emphasis, and a confident close.", targets: { minPitchVariation: 30, minEnergy: 40, minVolume: 40, maxFillerWords: 0, wpmRange: [110, 130] }, starThresholds: [55, 75, 92], xpReward: 45 },
        ],
      },
      {
        id: "p3", unitId: "persuasion", title: "Closing Strong", description: "End with a call to action they can't ignore",
        unlockRequirement: 36,
        exercises: [
          { id: "p3e1", scriptId: "a5", type: "emphasis", title: "The Urgency", instruction: "Deliver this close with rising urgency. Build momentum toward the call to action.", targets: { minPitchVariation: 25, minEnergy: 40, minVolumeVariation: 25 }, starThresholds: [50, 72, 90], xpReward: 35 },
          { id: "p3e2", scriptId: "a3", type: "emphasis", title: "Inspire Action", instruction: "Close this visionary pitch so powerfully that the audience wants to act immediately. Peak energy on the final ask.", targets: { minPitchVariation: 35, minEnergy: 50, minVolumeVariation: 30, maxFillerWords: 0 }, starThresholds: [55, 75, 92], xpReward: 45 },
          { id: "p3e3", scriptId: "a5", type: "free-delivery", title: "The Perfect Close", instruction: "This is the final exercise. Deliver the strongest close you've ever given. Every skill you've learned — pace, volume, expression, zero fillers — bring it all together.", targets: { minPitchVariation: 35, minEnergy: 50, minVolume: 40, minVolumeVariation: 30, maxFillerWords: 0, wpmRange: [115, 140] }, starThresholds: [60, 78, 95], xpReward: 50 },
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
