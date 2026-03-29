import { useState, useEffect } from "react";
import { Persona } from "./data/personas";
import { FeedbackItem } from "./data/feedbackEngine";
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStartSession = (personas: Persona[], type: string) => {
    setSelectedPersonas(personas);
    setSessionType(type);
    setIsTransitioning(true);
    setView("joining");
  };

  const handleEndSession = (fb: FeedbackItem[], tx: string) => {
    setFeedback(fb);
    setTranscript(tx);
    setIsTransitioning(true);
    setView("generating");
  };

  const handleNewSession = () => {
    setFeedback([]);
    setTranscript("");
    setIsTransitioning(true);
    setView("setup");
  };

  useEffect(() => {
    if (view === "joining") {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setView("meeting");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    if (view === "generating") {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setView("feedback");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const renderInterstitial = (title: string, showProgress: boolean) => (
    <div className="min-h-screen bg-[#0f0f23] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin-pulse" />
        <h2 className="text-xl font-semibold">{title}</h2>
        {showProgress && (
          <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-500 animate-progress-bar" />
          </div>
        )}
      </div>
    </div>
  );

  switch (view) {
    case "joining":
      return renderInterstitial(`Joining ${sessionType.replace(/-/g, " ")} session...`, false);
    case "generating":
      return renderInterstitial("Generating feedback...", true);
    case "meeting":
      return (
        <MeetingRoom
          personas={selectedPersonas}
          sessionType={sessionType}
          onEndSession={handleEndSession}
          onBack={handleNewSession}
        />
      );
    case "feedback":
      return (
        <FeedbackView
          feedback={feedback}
          transcript={transcript}
          onNewSession={handleNewSession}
        />
      );
    default:
      return <PersonaSelector onStartSession={handleStartSession} />;
  }
}
