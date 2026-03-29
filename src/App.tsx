import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Persona } from "./data/personas";
import { FeedbackItem } from "./data/feedbackEngine";
import { getTheme } from "./data/themes";
import { PersonaSelector } from "./components/PersonaSelector";
import { MeetingRoom } from "./components/MeetingRoom";
import { FeedbackView } from "./components/FeedbackView";

type AppView = "setup" | "meeting" | "feedback" | "joining" | "generating";

export default function App() {
  const [view, setView] = useState<AppView>("setup");
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [sessionType, setSessionType] = useState("business-pitch");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [transcript, setTranscript] = useState("");

  const handleStartSession = (personas: Persona[], type: string) => {
    setSelectedPersonas(personas);
    setSessionType(type);
    setView("joining");
  };

  const handleEndSession = (fb: FeedbackItem[], tx: string) => {
    setFeedback(fb);
    setTranscript(tx);
    setView("generating");
  };

  const handleNewSession = () => {
    setFeedback([]);
    setTranscript("");
    setView("setup");
  };

  useEffect(() => {
    if (view === "joining") {
      const timer = setTimeout(() => setView("meeting"), 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    if (view === "generating") {
      const timer = setTimeout(() => setView("feedback"), 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const theme = getTheme(sessionType);

  return (
    <AnimatePresence mode="wait">
      {view === "joining" && (
        <motion.div
          key="joining"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ThemedInterstitial
            title={theme.transitionLabel}
            subtext={theme.transitionSubtext}
            accentColor={theme.accentColor}
            backgroundClass={theme.backgroundClass}
          />
        </motion.div>
      )}

      {view === "generating" && (
        <motion.div
          key="generating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GeneratingInterstitial accentColor={theme.accentColor} />
        </motion.div>
      )}

      {view === "meeting" && (
        <motion.div
          key="meeting"
          className="h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <MeetingRoom
            personas={selectedPersonas}
            sessionType={sessionType}
            onEndSession={handleEndSession}
            onBack={handleNewSession}
          />
        </motion.div>
      )}

      {view === "feedback" && (
        <motion.div
          key="feedback"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FeedbackView
            feedback={feedback}
            transcript={transcript}
            onNewSession={handleNewSession}
          />
        </motion.div>
      )}

      {view === "setup" && (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PersonaSelector onStartSession={handleStartSession} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ThemedInterstitial({
  title,
  subtext,
  accentColor,
  backgroundClass,
}: {
  title: string;
  subtext: string;
  accentColor: string;
  backgroundClass: string;
}) {
  return (
    <div className={`min-h-screen text-white flex items-center justify-center relative overflow-hidden ${backgroundClass}`}>
      {/* Ambient glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "50%",
          height: "50%",
          background: `radial-gradient(circle, ${accentColor}25 0%, transparent 60%)`,
        }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex flex-col items-center gap-6 z-10">
        {/* Themed spinner */}
        <motion.div
          className="w-14 h-14 rounded-full border-2"
          style={{
            borderColor: `${accentColor}30`,
            borderTopColor: accentColor,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />

        <motion.h2
          className="text-2xl font-semibold tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {title}
        </motion.h2>

        <motion.p
          className="text-sm text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {subtext}
        </motion.p>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentColor }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GeneratingInterstitial({ accentColor }: { accentColor: string }) {
  return (
    <div className="min-h-screen bg-[#0f0f23] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          className="w-14 h-14 rounded-full border-2"
          style={{
            borderColor: `${accentColor}30`,
            borderTopColor: accentColor,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <h2 className="text-xl font-semibold">Generating feedback...</h2>
        <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: accentColor }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
