import { useState, useRef, useCallback, useEffect } from "react";

interface UseElevenLabsSTTReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  consumeNewText: () => string;
  supported: boolean;
}

interface STTMessage {
  type: string;
  text?: string;
  language_code?: string;
}

export function useElevenLabsSTT(): UseElevenLabsSTTReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const finalTranscriptRef = useRef("");
  const lastConsumedRef = useRef(0);

  // Check if ElevenLabs STT is available
  useEffect(() => {
    fetch("/api/elevenlabs-stt-token")
      .then((r) => r.json())
      .then((data) => {
        setSupported(data.available === true);
        if (data.available) console.log("[EL-STT] Available");
      })
      .catch(() => setSupported(false));
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      // Get a short-lived token from our server
      const tokenRes = await fetch("/api/elevenlabs-stt-token");
      const tokenData = await tokenRes.json();
      if (!tokenData.token) throw new Error("No token available");

      // Get mic audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Connect WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${tokenData.token}&model_id=scribe_v1&audio_format=pcm_16000&commit_strategy=vad&vad_silence_threshold_ms=1500&include_timestamps=false`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[EL-STT] WebSocket connected");
        setIsListening(true);

        // Set up audio processing — capture mic and send PCM chunks
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        if (audioContext.state === "suspended") audioContext.resume();
        contextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        // ScriptProcessorNode is deprecated but universally supported — AudioWorklet requires HTTPS + module
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16 PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
          }
          // Send as base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          ws.send(JSON.stringify({ type: "input_audio_chunk", data: base64 }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg: STTMessage = JSON.parse(event.data);

          if (msg.type === "transcript_partial") {
            setInterimTranscript(msg.text || "");
          } else if (msg.type === "transcript_committed") {
            const text = msg.text || "";
            if (text.trim()) {
              finalTranscriptRef.current += text + " ";
              setTranscript(finalTranscriptRef.current);
              setInterimTranscript("");
            }
          }
        } catch {}
      };

      ws.onerror = (err) => {
        console.error("[EL-STT] WebSocket error:", err);
      };

      ws.onclose = (event) => {
        console.log(`[EL-STT] WebSocket closed: ${event.code} ${event.reason}`);
        setIsListening(false);
        cleanup();
      };
    } catch (err) {
      console.error("[EL-STT] Failed to start:", err);
      setIsListening(false);
    }
  }, [isListening]);

  const cleanup = useCallback(() => {
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (contextRef.current) { contextRef.current.close().catch(() => {}); contextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  const stopListening = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    cleanup();
    setIsListening(false);
  }, [cleanup]);

  const consumeNewText = useCallback((): string => {
    const full = finalTranscriptRef.current;
    const newText = full.substring(lastConsumedRef.current).trim();
    lastConsumedRef.current = full.length;
    return newText;
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      cleanup();
    };
  }, [cleanup]);

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    consumeNewText,
    supported,
  };
}
