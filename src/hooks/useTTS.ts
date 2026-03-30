import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceConfig, pickBestVoice } from "../data/voiceConfig";

interface UseTTSReturn {
  speak: (text: string, personaId?: string, voiceConfig?: VoiceConfig) => void;
  stop: () => void;
  isSpeaking: boolean;
  speakingText: string;
  supported: boolean;
  usingApiVoice: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ttsAvailableRef = useRef(false);
  const [usingApi, setUsingApi] = useState(false);

  // Check TTS availability once on mount
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ttsAvailable === true) {
          ttsAvailableRef.current = true;
          setUsingApi(true);
          console.log("[TTS] OpenAI TTS available — will use natural voices");
        } else {
          console.log("[TTS] OpenAI TTS not available — using browser voices");
        }
      })
      .catch((err) => {
        console.log("[TTS] Health check failed, using browser voices:", err.message);
      });
  }, []);

  // Load browser voices as fallback
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) setBrowserVoices(available);
    };
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      speechSynthesis.cancel();
    };
  }, []);

  const stopCurrent = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    if (typeof window !== "undefined" && window.speechSynthesis) speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingText("");
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, voiceConfig?: VoiceConfig) => {
      if (!window.speechSynthesis) {
        setIsSpeaking(false);
        setSpeakingText("");
        return;
      }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceConfig) {
        const voice = pickBestVoice(browserVoices, voiceConfig);
        if (voice) utterance.voice = voice;
        utterance.pitch = voiceConfig.pitch;
        utterance.rate = voiceConfig.rate;
        utterance.volume = voiceConfig.volume;
      }
      utterance.onstart = () => { setIsSpeaking(true); setSpeakingText(text); };
      utterance.onend = () => { setIsSpeaking(false); setSpeakingText(""); };
      utterance.onerror = () => { setIsSpeaking(false); setSpeakingText(""); };
      speechSynthesis.speak(utterance);
    },
    [browserVoices]
  );

  const speak = useCallback(
    (text: string, personaId?: string, voiceConfig?: VoiceConfig) => {
      if (!text) return;
      stopCurrent();

      // Use ref (not state) to avoid stale closure issues
      if (ttsAvailableRef.current) {
        // === API TTS ===
        setIsSpeaking(true);
        setSpeakingText(text);

        const controller = new AbortController();
        abortRef.current = controller;

        console.log(`[TTS] Requesting API voice for ${personaId || "unknown"}: "${text.substring(0, 50)}..."`);

        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            personaId: personaId || undefined,
            speed: voiceConfig?.speed || 1.0,
          }),
          signal: controller.signal,
        })
          .then((res) => {
            if (!res.ok) throw new Error(`TTS API returned ${res.status}`);
            return res.blob();
          })
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
              setIsSpeaking(false);
              setSpeakingText("");
              URL.revokeObjectURL(url);
              audioRef.current = null;
            };
            audio.onerror = (e) => {
              console.error("[TTS] Audio playback error:", e);
              setIsSpeaking(false);
              setSpeakingText("");
              URL.revokeObjectURL(url);
              audioRef.current = null;
            };

            return audio.play();
          })
          .catch((err) => {
            if (err.name === "AbortError") return;
            console.error("[TTS] API failed, falling back to browser:", err.message);
            speakWithBrowser(text, voiceConfig);
          });
      } else {
        // === Browser TTS fallback ===
        console.log("[TTS] Using browser voice");
        setIsSpeaking(true);
        setSpeakingText(text);
        speakWithBrowser(text, voiceConfig);
      }
    },
    [stopCurrent, speakWithBrowser]
  );

  return {
    speak,
    stop: stopCurrent,
    isSpeaking,
    speakingText,
    supported: true,
    usingApiVoice: usingApi,
  };
}
