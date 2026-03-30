export interface SessionBehavior {
  id: string;
  label: string;
  // Audio mode
  continuousAudio: boolean;          // true = no send button, auto-send on silence
  silenceThresholdMs: number;        // ms of silence before treating as "turn complete"
  // Interruption rules
  allowInterruptions: boolean;       // can audience interrupt mid-speech?
  interruptAggressiveness: number;   // 0-1, how likely to interrupt (0=never, 1=aggressive)
  interruptMinWords: number;         // minimum words before first interrupt is allowed
  // Q&A behavior
  holdQuestionsUntilInvited: boolean;// audience holds questions until user says "any questions?"
  // Audience prompting
  promptUserOnLongSilence: boolean;  // audience encourages user if silent too long
  longSilenceThresholdMs: number;    // how long before "encouraging" the user
  // Teleprompter
  showTeleprompter: boolean;         // whether teleprompter is available
}

export const SESSION_BEHAVIORS: Record<string, SessionBehavior> = {
  "mock-trial": {
    id: "mock-trial",
    label: "Oral Argument",
    continuousAudio: true,
    silenceThresholdMs: 1500,        // 1.5s = you're done, judge can jump in
    allowInterruptions: true,
    interruptAggressiveness: 0.7,    // judges interrupt often
    interruptMinWords: 15,           // let them get at least a sentence out
    holdQuestionsUntilInvited: false,
    promptUserOnLongSilence: true,
    longSilenceThresholdMs: 5000,    // "Counsel, are you prepared to continue?"
    showTeleprompter: true,
  },
  "business-pitch": {
    id: "business-pitch",
    label: "Shark Tank Pitch",
    continuousAudio: true,
    silenceThresholdMs: 2500,        // 2.5s pause = turn complete
    allowInterruptions: true,
    interruptAggressiveness: 0.3,    // occasional interrupts
    interruptMinWords: 30,           // let them build their case first
    holdQuestionsUntilInvited: false,
    promptUserOnLongSilence: true,
    longSilenceThresholdMs: 8000,
    showTeleprompter: true,
  },
  "public-speaking": {
    id: "public-speaking",
    label: "Keynote / Speech",
    continuousAudio: true,
    silenceThresholdMs: 4000,        // 4s = generous pause allowance
    allowInterruptions: false,       // audience stays quiet
    interruptAggressiveness: 0,
    interruptMinWords: 999,
    holdQuestionsUntilInvited: true, // questions only when user invites them
    promptUserOnLongSilence: true,
    longSilenceThresholdMs: 10000,
    showTeleprompter: true,
  },
  "sales-demo": {
    id: "sales-demo",
    label: "Sales Presentation",
    continuousAudio: true,
    silenceThresholdMs: 3000,        // 3s = moderate threshold
    allowInterruptions: true,
    interruptAggressiveness: 0.2,    // occasional client questions
    interruptMinWords: 40,
    holdQuestionsUntilInvited: false,
    promptUserOnLongSilence: true,
    longSilenceThresholdMs: 8000,
    showTeleprompter: true,
  },
};

export function getSessionBehavior(sessionType: string): SessionBehavior {
  return SESSION_BEHAVIORS[sessionType] || SESSION_BEHAVIORS["business-pitch"];
}
