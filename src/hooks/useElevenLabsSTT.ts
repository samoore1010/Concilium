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
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<any>(null); // ScriptProcessorNode or AudioWorkletNode
  const finalTranscriptRef = useRef("");
  const lastConsumedRef = useRef(0);
  const chunksSentRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    fetch("/api/elevenlabs-stt-token")
      .then((r) => r.json())
      .then((d) => { setSupported(d.available === true); if (d.available) console.log("[EL-STT] Available"); })
      .catch(() => setSupported(false));
  }, []);

  const startListening = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });
    streamRef.current = stream;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/stt`;
    console.log("[EL-STT] Connecting via proxy...");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("[EL-STT] Connected");
      setIsListening(true);
      chunksSentRef.current = 0;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (ctx.state === "suspended") ctx.resume();
      contextRef.current = ctx;

      const actualRate = ctx.sampleRate;
      console.log(`[EL-STT] AudioContext rate: ${actualRate}Hz`);

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode with a workaround for Chrome:
      // Connect to destination via a gain node set to 0 (silent output)
      // This forces Chrome to keep the audio processing pipeline active
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      const downsampleRatio = actualRate / 16000;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Downsample to 16kHz if needed
        let samples: Float32Array;
        if (downsampleRatio > 1.01) {
          const newLen = Math.floor(inputData.length / downsampleRatio);
          samples = new Float32Array(newLen);
          for (let i = 0; i < newLen; i++) {
            samples[i] = inputData[Math.floor(i * downsampleRatio)];
          }
        } else {
          samples = new Float32Array(inputData);
        }

        // Convert to Int16 PCM
        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
        }

        // Encode and send
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

        try {
          ws.send(JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: btoa(binary),
            commit: false,
            sample_rate: 16000,
          }));
          chunksSentRef.current++;
          if (chunksSentRef.current === 1) console.log(`[EL-STT] First chunk sent: ${samples.length} samples`);
          if (chunksSentRef.current % 30 === 0) console.log(`[EL-STT] Chunks: ${chunksSentRef.current}`);
        } catch {}
      };

      console.log("[EL-STT] Audio pipeline connected (ScriptProcessor → silent gain → destination)");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data));
        const msgType = msg.message_type || msg.type;

        if (msgType === "transcript_partial" || msgType === "partial_transcript") {
          setInterimTranscript(msg.text || "");
        } else if (msgType === "transcript_committed" || msgType === "committed_transcript") {
          const text = msg.text || "";
          if (text.trim()) {
            finalTranscriptRef.current += text + " ";
            setTranscript(finalTranscriptRef.current);
            setInterimTranscript("");
            console.log(`[EL-STT] ✓ "${text.trim().substring(0, 60)}"`);
          }
        } else if (msgType === "session_started") {
          console.log("[EL-STT] Session active");
        } else if (msgType === "error" || msgType === "invalid_request") {
          console.error("[EL-STT] Server error:", JSON.stringify(msg));
        } else {
          console.log(`[EL-STT] ${msgType}:`, JSON.stringify(msg).substring(0, 200));
        }
      } catch {}
    };

    ws.onerror = () => console.error("[EL-STT] WebSocket error");
    ws.onclose = (event) => {
      console.log(`[EL-STT] Closed: code=${event.code} chunks=${chunksSentRef.current}`);
      if (chunksSentRef.current === 0) {
        console.warn("[EL-STT] No audio chunks were sent — ScriptProcessor may not have fired");
      }
      setIsListening(false);
      activeRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} sourceRef.current = null; }
    if (contextRef.current) { contextRef.current.close().catch(() => {}); contextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
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
    return () => { activeRef.current = false; if (wsRef.current) wsRef.current.close(); cleanup(); };
  }, [cleanup]);

  return { transcript, interimTranscript, isListening, startListening, stopListening, consumeNewText, supported };
}
