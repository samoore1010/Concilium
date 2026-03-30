import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
  // For continuous mode: get only the NEW text since last consume
  consumeNewText: () => string;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const lastConsumedIndexRef = useRef(0);
  const wantsListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + " ";
        } else {
          interim += t;
        }
      }
      setInterimTranscript(interim);
      setTranscript(finalTranscriptRef.current);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error", event.error);
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (wantsListeningRef.current) {
        try { recognition.start(); } catch { setIsListening(false); wantsListeningRef.current = false; }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    return () => { wantsListeningRef.current = false; recognitionRef.current?.abort(); };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && supported) {
      finalTranscriptRef.current = "";
      lastConsumedIndexRef.current = 0;
      setTranscript("");
      setInterimTranscript("");
      wantsListeningRef.current = true;
      try { recognitionRef.current.start(); } catch {}
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    wantsListeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  // Returns only the text that hasn't been consumed yet, then marks it as consumed
  const consumeNewText = useCallback((): string => {
    const full = finalTranscriptRef.current;
    const newText = full.substring(lastConsumedIndexRef.current).trim();
    lastConsumedIndexRef.current = full.length;
    return newText;
  }, []);

  return { transcript, interimTranscript, isListening, startListening, stopListening, supported, consumeNewText };
}
