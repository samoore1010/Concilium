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
  const audioChunksSent = useRef(0);

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

    const tokenRes = await fetch("/api/elevenlabs-stt-token");
    const tokenData = await tokenRes.json();
    if (!tokenData.token) throw new Error("No token available");

    // Get mic — let browser choose native sample rate
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;

    const token = encodeURIComponent(tokenData.token);
    const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${token}&model_id=scribe_v2_realtime&language_code=en&audio_format=pcm_16000&commit_strategy=vad&vad_silence_threshold_ms=1500`;
    console.log("[EL-STT] Connecting...");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[EL-STT] Connected");
      setIsListening(true);
      audioChunksSent.current = 0;

      // Create AudioContext at native sample rate, then downsample to 16kHz
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      contextRef.current = audioContext;

      const nativeSampleRate = audioContext.sampleRate;
      console.log(`[EL-STT] Native sample rate: ${nativeSampleRate}Hz`);

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Downsample to 16kHz if needed
        const targetRate = 16000;
        let samples: Float32Array;
        if (nativeSampleRate !== targetRate) {
          const ratio = nativeSampleRate / targetRate;
          const newLength = Math.floor(inputData.length / ratio);
          samples = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            samples[i] = inputData[Math.floor(i * ratio)];
          }
        } else {
          samples = inputData;
        }

        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
        }

        // Convert to base64 safely (avoid stack overflow from spread operator)
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        ws.send(JSON.stringify({ type: "input_audio_chunk", data: base64 }));
        audioChunksSent.current++;

        if (audioChunksSent.current % 20 === 0) {
          console.log(`[EL-STT] Sent ${audioChunksSent.current} chunks`);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcript_partial") {
          setInterimTranscript(msg.text || "");
        } else if (msg.type === "transcript_committed") {
          const text = msg.text || "";
          if (text.trim()) {
            finalTranscriptRef.current += text + " ";
            setTranscript(finalTranscriptRef.current);
            setInterimTranscript("");
            console.log(`[EL-STT] Committed: "${text.trim().substring(0, 50)}"`);
          }
        } else if (msg.type === "session_started") {
          console.log("[EL-STT] Session started by server");
        } else if (msg.type === "error") {
          console.error("[EL-STT] Server error:", msg.message || msg);
        }
      } catch {}
    };

    ws.onerror = (err) => {
      console.error("[EL-STT] Error:", err);
    };

    ws.onclose = (event) => {
      console.log(`[EL-STT] Closed: code=${event.code} reason="${event.reason}" chunks_sent=${audioChunksSent.current}`);
      setIsListening(false);
      cleanup();
      if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
        console.error("[EL-STT] Auth failed");
      }
    };
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

  return { transcript, interimTranscript, isListening, startListening, stopListening, consumeNewText, supported };
}
