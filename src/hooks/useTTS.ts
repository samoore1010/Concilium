import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceConfig, pickBestVoice } from "../data/voiceConfig";

export type TTSProvider = "auto" | "elevenlabs" | "openai" | "browser";

interface UseTTSReturn {
  speak: (text: string, personaId?: string, voiceConfig?: VoiceConfig) => void;
  stop: () => void;
  isSpeaking: boolean;
  speakingText: string;
  supported: boolean;
  availableProviders: string[];
  activeProvider: TTSProvider;
  setProvider: (p: TTSProvider) => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [activeProvider, setActiveProvider] = useState<TTSProvider>("auto");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const apiProvidersRef = useRef<string[]>([]);

  // Discover available providers
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        const providers = data.ttsProviders || [];
        apiProvidersRef.current = providers;
        setAvailableProviders(providers);
        if (providers.length > 0) {
          console.log(`[TTS] Available providers: ${providers.join(", ")}`);
        } else {
          console.log("[TTS] No API providers — using browser voices");
        }
      })
      .catch(() => {
        console.log("[TTS] Health check failed — using browser voices");
      });
  }, []);

  // Load browser voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setBrowserVoices(v);
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => { speechSynthesis.removeEventListener("voiceschanged", load); speechSynthesis.cancel(); };
  }, []);

  const stopCurrent = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    if (typeof window !== "undefined" && window.speechSynthesis) speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingText("");
  }, []);

  const speakWithBrowser = useCallback((text: string, voiceConfig?: VoiceConfig) => {
    if (!window.speechSynthesis) { setIsSpeaking(false); setSpeakingText(""); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceConfig) {
      const v = pickBestVoice(browserVoices, voiceConfig);
      if (v) u.voice = v;
      u.pitch = voiceConfig.pitch;
      u.rate = voiceConfig.rate;
      u.volume = voiceConfig.volume;
    }
    u.onstart = () => { setIsSpeaking(true); setSpeakingText(text); };
    u.onend = () => { setIsSpeaking(false); setSpeakingText(""); };
    u.onerror = () => { setIsSpeaking(false); setSpeakingText(""); };
    speechSynthesis.speak(u);
  }, [browserVoices]);

  const speak = useCallback((text: string, personaId?: string, voiceConfig?: VoiceConfig) => {
    if (!text) return;
    stopCurrent();

    // Determine which provider to use
    const providers = apiProvidersRef.current;
    let useApi: string | null = null;

    if (activeProvider === "browser") {
      // Explicitly chose browser
      useApi = null;
    } else if (activeProvider === "elevenlabs" && providers.includes("elevenlabs")) {
      useApi = "elevenlabs";
    } else if (activeProvider === "openai" && providers.includes("openai")) {
      useApi = "openai";
    } else if (activeProvider === "auto") {
      // Auto: prefer elevenlabs > openai > browser
      if (providers.includes("elevenlabs")) useApi = "elevenlabs";
      else if (providers.includes("openai")) useApi = "openai";
    }

    if (useApi) {
      setIsSpeaking(true);
      setSpeakingText(text);

      const controller = new AbortController();
      abortRef.current = controller;

      console.log(`[TTS] Using ${useApi} for ${personaId || "unknown"}`);

      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, personaId, speed: voiceConfig?.speed || 1.0, provider: useApi }),
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
          audio.onended = () => { setIsSpeaking(false); setSpeakingText(""); URL.revokeObjectURL(url); audioRef.current = null; };
          audio.onerror = () => { setIsSpeaking(false); setSpeakingText(""); URL.revokeObjectURL(url); audioRef.current = null; };
          return audio.play();
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error(`[TTS] ${useApi} failed, falling back to browser:`, err.message);
          speakWithBrowser(text, voiceConfig);
        });
    } else {
      console.log("[TTS] Using browser voice");
      setIsSpeaking(true);
      setSpeakingText(text);
      speakWithBrowser(text, voiceConfig);
    }
  }, [stopCurrent, speakWithBrowser, activeProvider]);

  return {
    speak,
    stop: stopCurrent,
    isSpeaking,
    speakingText,
    supported: true,
    availableProviders,
    activeProvider,
    setProvider: setActiveProvider,
  };
}
