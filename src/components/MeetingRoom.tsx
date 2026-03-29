import { useState, useEffect, useRef, useCallback } from "react";
import { Persona, ReactionType } from "../data/personas";
import { generateLiveReaction, ReactionEvent, generateSessionFeedback, FeedbackItem, shouldRaiseHand, HandRaiseEvent } from "../data/feedbackEngine";
import { AudienceTile } from "./AudienceTile";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useCamera } from "../hooks/useCamera";
import { useSpeechMetrics, SpeechMetrics } from "../hooks/useSpeechMetrics";
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

export function MeetingRoom({ personas, sessionType, onEndSession, onBack }: MeetingRoomProps) {
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [elapsed, setElapsed] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; time: number }[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [handRaises, setHandRaises] = useState<HandRaiseEvent[]>([]);
  const [coachOpen, setCoachOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Hooks for camera and speech
  const { videoRef, isActive: isCameraActive, startCamera, stopCamera } = useCamera();
  const { transcript: speechTranscript, isListening, startListening, stopListening } = useSpeechRecognition();
  const { metrics: speechMetrics, updateMetrics } = useSpeechMetrics();

  // Auto-send speech transcript
  useEffect(() => {
    if (speechTranscript && speechTranscript.length > 0) {
      setInputText(speechTranscript);
    }
  }, [speechTranscript]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Random ambient reactions
  useEffect(() => {
    const interval = setInterval(() => {
      const randomPersona = personas[Math.floor(Math.random() * personas.length)];
      if (Math.random() > 0.6) {
        const ambient: ReactionType[] = ["think", "neutral", "nod"];
        const type = ambient[Math.floor(Math.random() * ambient.length)];
        setPersonaStates((prev) => ({
          ...prev,
          [randomPersona.id]: { reaction: type },
        }));
        // Reset after a bit
        setTimeout(() => {
          setPersonaStates((prev) => ({
            ...prev,
            [randomPersona.id]: { reaction: "neutral" },
          }));
        }, 2000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [personas]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setTranscript((prev) => [...prev, text]);
    setChatMessages((prev) => [...prev, { from: "You", text, time: elapsed }]);

    // Update speech metrics
    updateMetrics(text);

    setInputText("");
    const newMessageCount = messageCount + 1;
    setMessageCount(newMessageCount);

    // Generate reactions from each persona
    personas.forEach((persona) => {
      const delay = 500 + Math.random() * 2000;
      setTimeout(() => {
        const reactionEvent = generateLiveReaction(persona, text);
        if (reactionEvent) {
          setPersonaStates((prev) => ({
            ...prev,
            [persona.id]: { reaction: reactionEvent.type, emoji: reactionEvent.emoji, lastHandRaiseAt: prev[persona.id]?.lastHandRaiseAt },
          }));

          // Some personas might "chat" a short response
          if (Math.random() > 0.65) {
            const quickResponses = getQuickResponse(persona, text);
            if (quickResponses) {
              setTimeout(() => {
                setChatMessages((prev) => [
                  ...prev,
                  { from: persona.name, text: quickResponses, time: elapsed },
                ]);
              }, 1000 + Math.random() * 1500);
            }
          }

          // Reset reaction
          setTimeout(() => {
            setPersonaStates((prev) => ({
              ...prev,
              [persona.id]: { reaction: "neutral", emoji: undefined, lastHandRaiseAt: prev[persona.id]?.lastHandRaiseAt },
            }));
          }, 2500);
        }

        // Check for hand-raise with cooldown
        const now = Date.now();
        const lastRaise = personaStates[persona.id]?.lastHandRaiseAt || 0;
        if (now - lastRaise > 5000) {
          const raiseEvent = shouldRaiseHand(persona, text, newMessageCount);
          if (raiseEvent) {
            setHandRaises((prev) => [...prev, raiseEvent]);
            setPersonaStates((prev) => ({
              ...prev,
              [persona.id]: { ...prev[persona.id], lastHandRaiseAt: now },
            }));
          }
        }
      }, delay);
    });
  }, [inputText, personas, elapsed, messageCount, personaStates, updateMetrics]);

  const handleEndSession = () => {
    clearInterval(timerRef.current);
    stopCamera();
    stopListening();
    const fullTranscript = transcript.join(" ");
    const feedback = personas.map((p) => generateSessionFeedback(p, fullTranscript));

    // Save session to history
    const avgScore = feedback.reduce((sum, f) => sum + f.overallScore, 0) / feedback.length;
    const perPersonaScores: Record<string, number> = {};
    feedback.forEach((f) => {
      perPersonaScores[f.personaId] = f.overallScore;
    });

    const session: SessionRecord = {
      id: Date.now().toString(),
      date: Date.now(),
      sessionType,
      personaIds: personas.map((p) => p.id),
      overallScore: avgScore,
      perPersonaScores,
      wordCount: fullTranscript.split(/\s+/).filter(Boolean).length,
      duration: elapsed,
      speechMetrics: {
        wordsPerMinute: speechMetrics.wordsPerMinute,
        fillerWordCount: speechMetrics.fillerWordCount,
        longestPause: speechMetrics.longestPause,
        vocabularyScore: speechMetrics.vocabularyScore,
      },
    };
    addSession(session);

    onEndSession(feedback, fullTranscript);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const sessionLabel: Record<string, string> = {
    "business-pitch": "Business Pitch Session",
    "mock-trial": "Mock Trial Session",
    "public-speaking": "Public Speaking Session",
    "sales-demo": "Sales Demo Session",
  };

  // Grid layout based on total tiles (personas + self-view)
  const totalTiles = personas.length + 1;
  const gridClass =
    totalTiles <= 2
      ? "grid-cols-2"
      : totalTiles <= 4
      ? "grid-cols-2"
      : totalTiles <= 6
      ? "grid-cols-3"
      : "grid-cols-4";

  const handleCallOn = (handRaise: HandRaiseEvent) => {
    const persona = personas.find((p) => p.id === handRaise.personaId);
    if (persona) {
      setChatMessages((prev) => [
        ...prev,
        { from: persona.name, text: handRaise.question, time: elapsed },
      ]);
      setPersonaStates((prev) => ({
        ...prev,
        [persona.id]: { reaction: "raised-hand", emoji: "✋" },
      }));
      setHandRaises((prev) => prev.filter((hr) => hr.personaId !== handRaise.personaId));
      setTimeout(() => {
        setPersonaStates((prev) => ({
          ...prev,
          [persona.id]: { reaction: "neutral", emoji: undefined },
        }));
      }, 2500);
    }
  };

  const handleDismiss = (personaId: string) => {
    setHandRaises((prev) => prev.filter((hr) => hr.personaId !== personaId));
  };

  return (
    <div className="h-screen flex flex-col meeting-bg text-white">
      {/* Hand-raise notifications */}
      {handRaises.length > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {personas.find((p) => p.id === handRaises[0].personaId)?.name} wants to ask a question
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCallOn(handRaises[0])}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              Call On
            </button>
            <button
              onClick={() => handleDismiss(handRaises[0].personaId)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium">{sessionLabel[sessionType] || "Practice Session"}</span>
          <span className="text-xs text-white/40 font-mono">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{personas.length} audience members</span>
          <button onClick={onBack} className="text-xs text-white/40 hover:text-white/70 px-2 py-1">
            Back
          </button>
          <button
            onClick={handleEndSession}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Audience grid */}
        <div className="flex-1 p-4">
          <div className={`grid ${gridClass} gap-3 h-full`}>
            {/* User's self-view tile */}
            <div className="frosted-glass rounded-lg flex flex-col items-center justify-end overflow-hidden relative">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover mirror" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/20 text-sm">Camera Off</div>
                </div>
              )}
              <div className="relative z-10 w-full px-3 py-2 bg-black/50 flex items-center justify-between">
                <span className="text-xs font-medium text-white">You</span>
                {isCameraActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Live</span>
                )}
              </div>
            </div>

            {personas.map((persona) => {
              const state = personaStates[persona.id] || { reaction: "neutral" as ReactionType };
              return (
                <AudienceTile
                  key={persona.id}
                  persona={persona}
                  reaction={state.reaction}
                  reactionEmoji={state.emoji}
                />
              );
            })}
          </div>
        </div>

        {/* Side panel — Chat / Coach */}
        <div className="w-72 border-l border-white/5 flex flex-col bg-black/20">
          {/* Toggle tabs */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setCoachOpen(false)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                !coachOpen ? "text-white bg-white/10" : "text-white/50 hover:text-white/70"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setCoachOpen(true)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                coachOpen ? "text-white bg-white/10" : "text-white/50 hover:text-white/70"
              }`}
            >
              Coach
            </button>
          </div>

          {coachOpen ? (
            // Coach panel
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs">
              <div>
                <div className="text-white/50 mb-1">Words Per Minute</div>
                <div className="text-lg font-bold text-blue-400">{speechMetrics.wordsPerMinute}</div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (speechMetrics.wordsPerMinute / 150) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="text-white/50 mb-1">Filler Words</div>
                <div className="text-lg font-bold text-orange-400">{speechMetrics.fillerWordCount}</div>
                <div className="text-white/40 text-[10px] mt-1">{speechMetrics.fillerWordCount > 5 ? "Reduce' usage" : "Good"}</div>
              </div>

              <div>
                <div className="text-white/50 mb-1">Vocabulary Variety</div>
                <div className="text-lg font-bold text-emerald-400">{speechMetrics.vocabularyScore}</div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${speechMetrics.vocabularyScore}%` }} />
                </div>
              </div>

              <div>
                <div className="text-white/50 mb-1">Longest Pause</div>
                <div className="text-lg font-bold text-yellow-400">{speechMetrics.longestPause.toFixed(1)}s</div>
                <div className="text-white/40 text-[10px] mt-1">{speechMetrics.longestPause > 3 ? "Take more pauses" : "Steady pace"}</div>
              </div>
            </div>
          ) : (
            // Chat panel
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-xs text-white/20 text-center mt-8">
                  Start speaking to see audience reactions...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-xs ${msg.from === "You" ? "text-blue-300" : "text-white/70"}`}>
                  <span className="font-medium">{msg.from}:</span>{" "}
                  <span className="text-white/50">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — input area */}
      <div className="border-t border-white/5 bg-black/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="flex items-center gap-2 mr-2">
            <ToolbarButton
              icon="mic"
              label="Mic"
              isActive={isListening}
              onClick={() => (isListening ? stopListening() : startListening())}
            />
            <ToolbarButton
              icon="video"
              label="Video"
              isActive={isCameraActive}
              onClick={() => (isCameraActive ? stopCamera() : startCamera())}
            />
            <ToolbarButton icon="screen" label="Share" />
          </div>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your presentation text here (or use mic)..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-400/50 transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const icons: Record<string, React.ReactElement> = {
    mic: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a2.5 2.5 0 00-2.5 2.5v4a2.5 2.5 0 005 0v-4A2.5 2.5 0 008 1zM5 6.5a3.5 3.5 0 107 0h-1a2.5 2.5 0 01-5 0H5z" />
        <path d="M4 8.5a.5.5 0 011 0A3 3 0 008 11.5a3 3 0 003-3 .5.5 0 011 0 4 4 0 01-3.5 3.97V14h2a.5.5 0 010 1h-5a.5.5 0 010-1h2v-1.53A4 4 0 014 8.5z" />
      </svg>
    ),
    video: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.5 3A1.5 1.5 0 001 4.5v7A1.5 1.5 0 002.5 13h7A1.5 1.5 0 0011 11.5v-2l3.5 2V4.5L11 6.5v-2A1.5 1.5 0 009.5 3h-7z" />
      </svg>
    ),
    screen: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 2A1.5 1.5 0 000 3.5v8A1.5 1.5 0 001.5 13h13a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0014.5 2h-13zM1 3.5a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v8a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-8z" />
        <path d="M6 14.5a.5.5 0 010-1h4a.5.5 0 010 1H6z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
        isActive
          ? "bg-blue-500 text-white"
          : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80"
      }`}
      title={label}
    >
      {icons[icon]}
    </button>
  );
}

function getQuickResponse(persona: Persona, userText: string): string | null {
  const lower = userText.toLowerCase();
  const style = persona.communicationStyle;

  const responses: Record<string, string[]> = {
    analytical: [
      "What's the data behind that claim?",
      "Can you quantify that impact?",
      "Interesting — do you have a case study?",
      "What's the sample size here?",
    ],
    emotional: [
      "I love the vision here!",
      "How does this help everyday people?",
      "Tell me more about the human side of this.",
      "Who benefits most from this?",
    ],
    skeptical: [
      "I've heard this before. What's different?",
      "What about the risks?",
      "Sounds optimistic. What could go wrong?",
      "Who else has tried this?",
    ],
    supportive: [
      "I appreciate the honesty there.",
      "That's a thoughtful approach.",
      "Good point — keep going.",
      "I can see the potential here.",
    ],
    blunt: [
      "Get to the point — what do you need?",
      "How much does it cost?",
      "What's the bottom line?",
      "Skip the fluff. What's the ask?",
    ],
  };

  const pool = responses[style] || responses.analytical;
  return pool[Math.floor(Math.random() * pool.length)];
}
