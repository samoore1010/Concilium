import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  // Track whether the user intentionally wants listening on
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

    recognition.onstart = () => {
      setIsListening(true);
    };

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
      // "aborted" is expected when we call stop()
      if (event.error !== "aborted") {
        console.error("Speech recognition error", event.error);
      }
      // "no-speech" is a timeout — not a reason to stop if user wants listening
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if the user hasn't explicitly stopped
      // Browser speech recognition times out after silence — this keeps it alive
      if (wantsListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or other issue — ignore
          setIsListening(false);
          wantsListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      wantsListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && supported) {
      finalTranscriptRef.current = "";
      setTranscript("");
      setInterimTranscript("");
      wantsListeningRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {
        // May already be started
      }
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    wantsListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    supported,
  };
}
