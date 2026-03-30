import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Persona } from "./data/personas";
import { FeedbackItem } from "./data/feedbackEngine";
import { SessionRecord } from "./data/sessionHistory";
import { getTheme } from "./data/themes";
import { loadProgress, recordExercise, UserProgress, Achievement } from "./data/practice/progress";
import { DeliveryScore } from "./data/practice/scoring";
import { LandingPage } from "./components/practice/LandingPage";
import { PracticeDashboard } from "./components/practice/PracticeDashboard";
import { ExerciseView } from "./components/practice/ExerciseView";
import { PersonaSelector } from "./components/PersonaSelector";
import { MeetingRoom } from "./components/MeetingRoom";
import { FeedbackView } from "./components/FeedbackView";

type AppView =
  | "landing"
  | "practice-dashboard"
  | "practice-exercise"
  | "setup"
  | "meeting"
  | "feedback"
  | "joining";

export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [sessionType, setSessionType] = useState("business-pitch");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [practiceProgress, setPracticeProgress] = useState<UserProgress>(loadProgress());
  const [currentLessonId, setCurrentLessonId] = useState<string>("");
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);

  // === PERFORM MODE HANDLERS ===
  const handleStartSession = (personas: Persona[], type: string) => {
    setSelectedPersonas(personas);
    setSessionType(type);
    setView("joining");
  };

  const handleEndSession = (fb: FeedbackItem[], tx: string) => {
    setFeedback(fb);
    setTranscript(tx);
    setView("feedback");
  };

  const handleNewSession = () => {
    setFeedback([]);
    setTranscript("");
    setView("setup");
  };

  const handleViewSession = (session: SessionRecord) => {
    if (session.feedback) {
      setFeedback(session.feedback as FeedbackItem[]);
      setTranscript(session.transcript || "");
      setView("feedback");
    }
  };

  // === PRACTICE MODE HANDLERS ===
  const handleSelectLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setView("practice-exercise");
  };

  const handleExerciseComplete = (exerciseId: string, score: DeliveryScore) => {
    const { progress, newAchievements } = recordExercise(
      practiceProgress, exerciseId, score.stars, score.overall, score.xpEarned
    );
    setPracticeProgress(progress);

    if (newAchievements.length > 0) {
      setAchievementToast(newAchievements[0]);
      setTimeout(() => setAchievementToast(null), 4000);
    }
  };

  // === JOINING TIMER ===
  useEffect(() => {
    if (view === "joining") {
      const timer = setTimeout(() => setView("meeting"), 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const theme = getTheme(sessionType);

  return (
    <>
      {/* Achievement toast */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-yellow-500/20 border border-yellow-500/40 backdrop-blur-md rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
          >
            <span className="text-2xl">{achievementToast.icon}</span>
            <div>
              <div className="text-sm font-semibold text-yellow-300">Achievement Unlocked!</div>
              <div className="text-xs text-white/60">{achievementToast.title} — {achievementToast.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <LandingPage onSelectMode={(mode) => setView(mode === "practice" ? "practice-dashboard" : "setup")} />
          </motion.div>
        )}

        {view === "practice-dashboard" && (
          <motion.div key="practice-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <PracticeDashboard progress={practiceProgress} onSelectLesson={handleSelectLesson} onBack={() => setView("landing")} />
          </motion.div>
        )}

        {view === "practice-exercise" && (
          <motion.div key="practice-exercise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ExerciseView
              lessonId={currentLessonId}
              onComplete={handleExerciseComplete}
              onBack={() => { setPracticeProgress(loadProgress()); setView("practice-dashboard"); }}
            />
          </motion.div>
        )}

        {view === "joining" && (
          <motion.div key="joining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <ThemedInterstitial title={theme.transitionLabel} subtext={theme.transitionSubtext} accentColor={theme.accentColor} backgroundClass={theme.backgroundClass} />
          </motion.div>
        )}

        {view === "meeting" && (
          <motion.div key="meeting" className="h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <MeetingRoom personas={selectedPersonas} sessionType={sessionType} onEndSession={handleEndSession} onBack={handleNewSession} />
          </motion.div>
        )}

        {view === "feedback" && (
          <motion.div key="feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <FeedbackView feedback={feedback} transcript={transcript} onNewSession={handleNewSession} onViewSession={handleViewSession} />
          </motion.div>
        )}

        {view === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <PersonaSelector onStartSession={handleStartSession} onViewSession={handleViewSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ThemedInterstitial({ title, subtext, accentColor, backgroundClass }: { title: string; subtext: string; accentColor: string; backgroundClass: string }) {
  return (
    <div className={`min-h-screen text-white flex items-center justify-center relative overflow-hidden ${backgroundClass}`}>
      <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: "50%", height: "50%", background: `radial-gradient(circle, ${accentColor}25 0%, transparent 60%)` }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex flex-col items-center gap-6 z-10">
        <motion.div className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }}
          animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <motion.h2 className="text-2xl font-semibold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{title}</motion.h2>
        <motion.p className="text-sm text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>{subtext}</motion.p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
