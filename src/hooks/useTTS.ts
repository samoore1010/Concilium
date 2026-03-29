import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceConfig, pickBestVoice, PERSONA_VOICE_MAP } from "../data/voiceConfig";

interface UseTTSReturn {
  speak: (text: string, voiceConfig?: VoiceConfig) => void;
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

  // Check if server-side TTS is available
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setTtsApiAvailable(data.ttsAvailable === true);
      })
      .catch(() => setTtsApiAvailable(false));
  }, []);

  // Load browser voices as fallback
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
    async (text: string, voiceConfig?: VoiceConfig) => {
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
            personaId: voiceConfig ? findPersonaId(voiceConfig) : undefined,
            speed: voiceConfig?.speed || 1.0,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("TTS API failed");

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
        // Fall back to browser TTS
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

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingText(text);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingText("");
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingText("");
      };

      speechSynthesis.speak(utterance);
    },
    [browserVoices]
  );

  const speak = useCallback(
    (text: string, voiceConfig?: VoiceConfig) => {
      if (!text) return;

      // Stop any current speech
      stop();

      if (ttsApiAvailable) {
        speakWithApi(text, voiceConfig);
      } else {
        speakWithBrowser(text, voiceConfig);
      }
    },
    [ttsApiAvailable, speakWithApi, speakWithBrowser]
  );

  const stop = useCallback(() => {
    // Stop API audio
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Stop browser TTS
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setSpeakingText("");
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    speakingText,
    supported: supported || ttsApiAvailable,
    usingApiVoice: ttsApiAvailable,
  };
}

// Reverse-lookup persona ID from voice config (for API call)
function findPersonaId(config: VoiceConfig): string | undefined {
  for (const [id, vc] of Object.entries(PERSONA_VOICE_MAP)) {
    if (vc.openaiVoice === config.openaiVoice) return id;
  }
  return undefined;
}
