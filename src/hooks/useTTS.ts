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
  const [supported, setSupported] = useState(true);
  const [ttsApiAvailable, setTtsApiAvailable] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ttsAvailable === true) {
          setTtsApiAvailable(true);
          console.log("OpenAI TTS available");
        }
      })
      .catch(() => setTtsApiAvailable(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(ttsApiAvailable);
      return;
    }
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
  }, [ttsApiAvailable]);

  const speakWithApi = useCallback(
    async (text: string, personaId?: string, voiceConfig?: VoiceConfig) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSpeaking(true);
      setSpeakingText(text);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            personaId: personaId || undefined,
            speed: voiceConfig?.speed || 1.0,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`TTS API returned ${res.status}`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setSpeakingText("");
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setSpeakingText("");
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };

        await audio.play();
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("API TTS failed, falling back to browser:", err);
        speakWithBrowser(text, voiceConfig);
      }
    },
    []
  );

  const speakWithBrowser = useCallback(
    (text: string, voiceConfig?: VoiceConfig) => {
      if (!window.speechSynthesis) return;
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
      if (ttsApiAvailable) {
        speakWithApi(text, personaId, voiceConfig);
      } else {
        speakWithBrowser(text, voiceConfig);
      }
    },
    [ttsApiAvailable, speakWithApi, speakWithBrowser]
  );

  const stopCurrent = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingText("");
  }, []);

  return {
    speak,
    stop: stopCurrent,
    isSpeaking,
    speakingText,
    supported: supported || ttsApiAvailable,
    usingApiVoice: ttsApiAvailable,
  };
}
