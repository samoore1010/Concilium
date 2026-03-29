import { useState, useEffect, useCallback, useRef } from "react";
import { VoiceConfig, pickBestVoice } from "../data/voiceConfig";

interface UseTTSReturn {
  speak: (text: string, voiceConfig?: VoiceConfig) => void;
  stop: () => void;
  isSpeaking: boolean;
  speakingText: string;
  voices: SpeechSynthesisVoice[];
  supported: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string, voiceConfig?: VoiceConfig) => {
      if (!supported || !text) return;

      // Cancel any in-progress speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (voiceConfig) {
        const voice = pickBestVoice(voices, voiceConfig);
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
        utteranceRef.current = null;
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingText("");
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [supported, voices]
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingText("");
    utteranceRef.current = null;
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    speakingText,
    voices,
    supported,
  };
}
