import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Persona, ReactionType } from "../data/personas";
import { generateLiveReaction, generateSessionFeedback, FeedbackItem, shouldRaiseHand } from "../data/feedbackEngine";
import { getTheme } from "../data/themes";
import { getVoiceConfig } from "../data/voiceConfig";
import { AudienceTile } from "./AudienceTile";
import { ThemedBackground } from "./ThemedBackground";
import { ThemedLayout } from "./ThemedLayout";
import { QuestionQueue, QueuedQuestion, handRaiseToQueuedQuestion } from "./QuestionQueue";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useCamera } from "../hooks/useCamera";
import { useSpeechMetrics } from "../hooks/useSpeechMetrics";
import { useTTS } from "../hooks/useTTS";
import { addSession, SessionRecord } from "../data/sessionHistory";

interface MeetingRoomProps {
  personas: Persona[];
  sessionType: string;
  onEndSession: (feedback: FeedbackItem[], transcript: string) => void;
  onBack: () => void;
}

interface PersonaState {
  reaction: ReactionType;
  emoji?: string;
  lastHandRaiseAt?: number;
}

type SideTab = "chat" | "coach" | "questions";

export function MeetingRoom({ personas, sessionType, onEndSession, onBack }: MeetingRoomProps) {
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [elapsed, setElapsed] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; time: number }[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<QueuedQuestion[]>([]);
  const [speakingPersonaId, setSpeakingPersonaId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sideTab, setSideTab] = useState<SideTab>("chat");
  const [mobilePanel, setMobilePanel] = useState<SideTab | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const theme = getTheme(sessionType);

  const { videoRef, isActive: isCameraActive, startCamera, stopCamera } = useCamera();
  const { transcript: speechTranscript, isListening, startListening, stopListening } = useSpeechRecognition();
  const { metrics: speechMetrics, updateMetrics } = useSpeechMetrics();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  useEffect(() => {
    if (!isSpeaking && speakingPersonaId) {
      const timer = setTimeout(() => {
        setPersonaStates((prev) => ({
          ...prev,
          [speakingPersonaId]: { ...prev[speakingPersonaId], reaction: "neutral" },
        }));
        setSpeakingPersonaId(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, speakingPersonaId]);

  useEffect(() => {
    if (speechTranscript && speechTranscript.length > 0) setInputText(speechTranscript);
  }, [speechTranscript]);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const rp = personas[Math.floor(Math.random() * personas.length)];
      if (Math.random() > 0.6 && speakingPersonaId !== rp.id) {
        const type = (["think", "neutral", "nod"] as ReactionType[])[Math.floor(Math.random() * 3)];
        setPersonaStates((prev) => ({ ...prev, [rp.id]: { ...prev[rp.id], reaction: type } }));
        setTimeout(() => {
          setPersonaStates((prev) => ({ ...prev, [rp.id]: { ...prev[rp.id], reaction: "neutral" } }));
        }, 2000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [personas, speakingPersonaId]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setTranscript((prev) => [...prev, text]);
    setChatMessages((prev) => [...prev, { from: "You", text, time: elapsed }]);
    updateMetrics(text);
    setInputText("");
    const newMC = messageCount + 1;
    setMessageCount(newMC);

    personas.forEach((persona) => {
      const delay = 500 + Math.random() * 2000;
      setTimeout(() => {
        const re = generateLiveReaction(persona, text);
        if (re) {
          setPersonaStates((prev) => ({
            ...prev,
            [persona.id]: { reaction: re.type, emoji: re.emoji, lastHandRaiseAt: prev[persona.id]?.lastHandRaiseAt },
          }));
          if (Math.random() > 0.65) {
            const qr = getQuickResponse(persona);
            if (qr) setTimeout(() => setChatMessages((prev) => [...prev, { from: persona.name, text: qr, time: elapsed }]), 1000 + Math.random() * 1500);
          }
          setTimeout(() => {
            setPersonaStates((prev) => ({
              ...prev,
              [persona.id]: { reaction: "neutral", emoji: undefined, lastHandRaiseAt: prev[persona.id]?.lastHandRaiseAt },
            }));
          }, 2500);
        }
        const now = Date.now();
        const lr = personaStates[persona.id]?.lastHandRaiseAt || 0;
        if (now - lr > 5000) {
          const raiseEvent = shouldRaiseHand(persona, text, newMC);
          if (raiseEvent) {
            setQuestionQueue((prev) => [...prev, handRaiseToQueuedQuestion(raiseEvent)]);
            setPersonaStates((prev) => ({
              ...prev, [persona.id]: { ...prev[persona.id], reaction: "raised-hand", lastHandRaiseAt: now },
            }));
            setTimeout(() => setPersonaStates((prev) => ({ ...prev, [persona.id]: { ...prev[persona.id], reaction: "neutral" } })), 3000);
          }
        }
      }, delay);
    });
  }, [inputText, personas, elapsed, messageCount, personaStates, updateMetrics]);

  const handleQuestionClick = (q: QueuedQuestion) => ttsEnabled ? handleListenToQuestion(q) : handleReadQuestion(q);

  const handleListenToQuestion = (q: QueuedQuestion) => {
    const persona = personas.find((p) => p.id === q.personaId);
    setSpeakingPersonaId(q.personaId);
    setPersonaStates((prev) => ({ ...prev, [q.personaId]: { ...prev[q.personaId], reaction: "speaking" } }));
    if (persona) setChatMessages((prev) => [...prev, { from: persona.name, text: q.question, time: elapsed }]);
    speak(q.question, getVoiceConfig(q.personaId));
    setQuestionQueue((prev) => prev.filter((x) => x.id !== q.id));
  };

  const handleReadQuestion = (q: QueuedQuestion) => {
    const persona = personas.find((p) => p.id === q.personaId);
    if (persona) setChatMessages((prev) => [...prev, { from: persona.name, text: q.question, time: elapsed }]);
    setQuestionQueue((prev) => prev.filter((x) => x.id !== q.id));
  };

  const handleEndSession = () => {
    clearInterval(timerRef.current);
    stopCamera(); stopListening(); stopTTS();
    const ft = transcript.join(" ");
    const feedback = personas.map((p) => generateSessionFeedback(p, ft));
    const avg = feedback.reduce((s, f) => s + f.overallScore, 0) / feedback.length;
    const pps: Record<string, number> = {};
    feedback.forEach((f) => { pps[f.personaId] = f.overallScore; });
    addSession({
      id: Date.now().toString(), date: Date.now(), sessionType,
      personaIds: personas.map((p) => p.id), overallScore: avg, perPersonaScores: pps,
      wordCount: ft.split(/\s+/).filter(Boolean).length, duration: elapsed,
      speechMetrics: { wordsPerMinute: speechMetrics.wordsPerMinute, fillerWordCount: speechMetrics.fillerWordCount, longestPause: speechMetrics.longestPause, vocabularyScore: speechMetrics.vocabularyScore },
    });
    onEndSession(feedback, ft);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const audienceTiles = personas.map((persona) => {
    const state = personaStates[persona.id] || { reaction: "neutral" as ReactionType };
    return (
      <AudienceTile
        key={persona.id} persona={persona} reaction={state.reaction} reactionEmoji={state.emoji}
        isSpeaking={speakingPersonaId === persona.id}
        pendingQuestion={questionQueue.find((q) => q.personaId === persona.id)}
        onQuestionClick={handleQuestionClick}
      />
    );
  });

  // === SELF-VIEW COMPONENT (reused in desktop sidebar + mobile) ===
  const selfView = (className: string) => (
    <div className={`rounded-lg bg-black/60 border border-white/20 overflow-hidden relative ${className}`}>
      {isCameraActive ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[10px] text-white/30">Camera Off</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-[9px] text-white/80 font-medium">You</span>
        {isCameraActive && <span className="text-[8px] px-1 rounded bg-green-500/30 text-green-300">Live</span>}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col text-white relative overflow-hidden">
      <ThemedBackground theme={theme} />

      <div className="relative z-10 flex flex-col h-full">
        {/* === TOP BAR === */}
        <div className={`flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-b ${theme.topBarAccent} border-b border-white/5 flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }} />
            <span className="text-xs font-medium truncate max-w-[120px] md:max-w-none">{theme.label}</span>
            <span className="text-[10px] text-white/40 font-mono">{fmt(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 hidden sm:inline">{personas.length} audience</span>
            <button onClick={onBack} className="text-[10px] text-white/40 hover:text-white/70 px-1.5 py-1 hidden sm:block">Back</button>
            <button onClick={handleEndSession} className="px-2.5 md:px-4 py-1 md:py-1.5 bg-red-500 hover:bg-red-600 rounded text-[11px] md:text-sm font-medium">End</button>
          </div>
        </div>

        {/* === MAIN AREA === */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* AUDIENCE AREA — full width on mobile, flex-1 on desktop */}
          <div className="flex-1 p-2 md:p-4 min-h-0 overflow-hidden">
            <ThemedLayout theme={theme}>
              {audienceTiles}
            </ThemedLayout>
          </div>

          {/* === DESKTOP SIDEBAR === */}
          <div className="hidden md:flex w-72 border-l border-white/5 flex-col bg-black/20 flex-shrink-0">
            {/* Self-view at top of sidebar */}
            <div className="p-2 border-b border-white/5">
              {selfView("w-full aspect-video")}
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-white/5 flex-shrink-0">
              {(["chat", "coach", "questions"] as SideTab[]).map((tab) => (
                <button
                  key={tab} onClick={() => setSideTab(tab)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors relative ${sideTab === tab ? "text-white bg-white/10" : "text-white/50 hover:text-white/70"}`}
                >
                  {tab === "questions" ? "Q&A" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "questions" && questionQueue.length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center font-bold">{questionQueue.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <TabContent
              sideTab={sideTab} questionQueue={questionQueue} personas={personas}
              speakingPersonaId={speakingPersonaId} ttsEnabled={ttsEnabled}
              speechMetrics={speechMetrics} chatMessages={chatMessages} chatEndRef={chatEndRef}
              onListen={handleListenToQuestion} onRead={handleReadQuestion}
              onDismiss={(id) => setQuestionQueue((prev) => prev.filter((q) => q.id !== id))}
              onToggleTTS={() => setTtsEnabled(!ttsEnabled)}
            />
          </div>
        </div>

        {/* === MOBILE BOTTOM SHEET === */}
        <AnimatePresence>
          {mobilePanel && (
            <>
              <motion.div
                key="backdrop" className="md:hidden fixed inset-0 z-30 bg-black/40"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobilePanel(null)}
              />
              <motion.div
                key="sheet"
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f23] border-t border-white/10 rounded-t-2xl flex flex-col"
                style={{ maxHeight: "60dvh" }}
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center justify-center py-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <div className="flex border-b border-white/5 flex-shrink-0">
                  {(["chat", "coach", "questions"] as SideTab[]).map((tab) => (
                    <button
                      key={tab} onClick={() => setMobilePanel(tab)}
                      className={`flex-1 px-2 py-2 text-xs font-medium relative ${mobilePanel === tab ? "text-white bg-white/10" : "text-white/50"}`}
                    >
                      {tab === "questions" ? "Q&A" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {tab === "questions" && questionQueue.length > 0 && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] flex items-center justify-center font-bold">{questionQueue.length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <TabContent
                    sideTab={mobilePanel} questionQueue={questionQueue} personas={personas}
                    speakingPersonaId={speakingPersonaId} ttsEnabled={ttsEnabled}
                    speechMetrics={speechMetrics} chatMessages={chatMessages} chatEndRef={chatEndRef}
                    onListen={handleListenToQuestion} onRead={handleReadQuestion}
                    onDismiss={(id) => setQuestionQueue((prev) => prev.filter((q) => q.id !== id))}
                    onToggleTTS={() => setTtsEnabled(!ttsEnabled)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* === MOBILE SELF-VIEW (small corner above input) === */}
        <div className="md:hidden absolute bottom-[52px] right-2 z-20">
          {selfView("w-20 h-14")}
        </div>

        {/* === BOTTOM BAR === */}
        <div className="border-t border-white/5 bg-black/40 px-2 md:px-4 py-1.5 md:py-3 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-1.5 md:gap-2 items-center">
            {/* Toolbar buttons */}
            <ToolbarBtn icon="mic" active={isListening} color={theme.accentColor} onClick={() => isListening ? stopListening() : startListening()} />
            <ToolbarBtn icon="video" active={isCameraActive} color={theme.accentColor} onClick={() => isCameraActive ? stopCamera() : startCamera()} />

            {/* Mobile: panel toggle buttons */}
            <button
              onClick={() => setMobilePanel(mobilePanel ? null : "chat")}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white/80 relative"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 2A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13H4l4 3v-3h4.5a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0012.5 2h-10z" />
              </svg>
              {(chatMessages.length > 0 || questionQueue.length > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* Input */}
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Speak or type..."
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 md:py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-400/50"
            />
            <button
              onClick={handleSendMessage} disabled={!inputText.trim()}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 rounded-lg text-sm font-medium flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === TAB CONTENT (shared by desktop sidebar + mobile bottom sheet) ===
function TabContent({ sideTab, questionQueue, personas, speakingPersonaId, ttsEnabled, speechMetrics, chatMessages, chatEndRef, onListen, onRead, onDismiss, onToggleTTS }: {
  sideTab: SideTab;
  questionQueue: QueuedQuestion[]; personas: Persona[]; speakingPersonaId: string | null;
  ttsEnabled: boolean;
  speechMetrics: { wordsPerMinute: number; fillerWordCount: number; vocabularyScore: number; longestPause: number };
  chatMessages: { from: string; text: string; time: number }[];
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onListen: (q: QueuedQuestion) => void; onRead: (q: QueuedQuestion) => void;
  onDismiss: (id: string) => void; onToggleTTS: () => void;
}) {
  if (sideTab === "coach") {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-xs">
        <Stat label="WPM" value={speechMetrics.wordsPerMinute} color="blue" pct={Math.min(100, (speechMetrics.wordsPerMinute / 150) * 100)} />
        <Stat label="Filler Words" value={speechMetrics.fillerWordCount} color="orange" sub={speechMetrics.fillerWordCount > 5 ? "Try to reduce" : "Good"} />
        <Stat label="Vocabulary" value={speechMetrics.vocabularyScore} color="emerald" pct={speechMetrics.vocabularyScore} />
        <Stat label="Longest Pause" value={`${speechMetrics.longestPause.toFixed(1)}s`} color="yellow" sub={speechMetrics.longestPause > 3 ? "Take more pauses" : "Steady pace"} />
      </div>
    );
  }
  if (sideTab === "questions") {
    return (
      <QuestionQueue
        questions={questionQueue} personas={personas} speakingPersonaId={speakingPersonaId}
        ttsEnabled={ttsEnabled} onListen={onListen} onRead={onRead} onDismiss={onDismiss} onToggleTTS={onToggleTTS}
      />
    );
  }
  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {chatMessages.length === 0 && <p className="text-xs text-white/20 text-center mt-6">Start speaking to see reactions...</p>}
      {chatMessages.map((msg, i) => (
        <div key={i} className={`text-xs ${msg.from === "You" ? "text-blue-300" : "text-white/70"}`}>
          <span className="font-medium">{msg.from}:</span> <span className="text-white/50">{msg.text}</span>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );
}

function Stat({ label, value, color, pct, sub }: { label: string; value: number | string; color: string; pct?: number; sub?: string }) {
  const colorMap: Record<string, string> = { blue: "text-blue-400", orange: "text-orange-400", emerald: "text-emerald-400", yellow: "text-yellow-400" };
  const bgMap: Record<string, string> = { blue: "bg-blue-400", orange: "bg-orange-400", emerald: "bg-emerald-400", yellow: "bg-yellow-400" };
  return (
    <div>
      <div className="text-white/50 mb-0.5 text-[11px]">{label}</div>
      <div className={`text-base font-bold ${colorMap[color]}`}>{value}</div>
      {pct !== undefined && (
        <div className="w-full h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
          <div className={`h-full ${bgMap[color]}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {sub && <div className="text-white/30 text-[10px] mt-0.5">{sub}</div>}
    </div>
  );
}

function ToolbarBtn({ icon, active, color, onClick }: { icon: string; active?: boolean; color: string; onClick: () => void }) {
  const paths: Record<string, string> = {
    mic: "M8 1a2.5 2.5 0 00-2.5 2.5v4a2.5 2.5 0 005 0v-4A2.5 2.5 0 008 1zM4 8.5a.5.5 0 011 0A3 3 0 008 11.5a3 3 0 003-3 .5.5 0 011 0 4 4 0 01-3.5 3.97V14h2a.5.5 0 010 1h-5a.5.5 0 010-1h2v-1.53A4 4 0 014 8.5z",
    video: "M2.5 3A1.5 1.5 0 001 4.5v7A1.5 1.5 0 002.5 13h7A1.5 1.5 0 0011 11.5v-2l3.5 2V4.5L11 6.5v-2A1.5 1.5 0 009.5 3h-7z",
  };
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${active ? "text-white" : "bg-white/5 hover:bg-white/10 text-white/50"}`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d={paths[icon]} /></svg>
    </button>
  );
}

function getQuickResponse(persona: Persona): string | null {
  const r: Record<string, string[]> = {
    analytical: ["What's the data behind that?", "Can you quantify that?", "Do you have a case study?", "What's the sample size?"],
    emotional: ["I love the vision!", "How does this help people?", "Tell me the human side.", "Who benefits most?"],
    skeptical: ["What's different here?", "What about the risks?", "What could go wrong?", "Who else has tried this?"],
    supportive: ["I appreciate the honesty.", "That's a thoughtful approach.", "Good point — keep going.", "I see the potential."],
    blunt: ["Get to the point.", "How much does it cost?", "What's the bottom line?", "Skip the fluff."],
  };
  const pool = r[persona.communicationStyle] || r.analytical;
  return pool[Math.floor(Math.random() * pool.length)];
}
