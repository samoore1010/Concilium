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
  const workletRef = useRef<AudioWorkletNode | MediaStreamAudioSourceNode | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
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

    const tokenRes = await fetch("/api/elevenlabs-stt-token");
    const tokenData = await tokenRes.json();
    if (!tokenData.token) throw new Error("No token");

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
      chunksSentRef.current = 0;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      contextRef.current = ctx;

      const nativeRate = ctx.sampleRate;
      console.log(`[EL-STT] Sample rate: ${nativeRate}Hz`);

      // Send initial silent audio chunk immediately to keep connection alive
      const silentPcm = new Int16Array(1600); // 100ms of silence at 16kHz
      const silentBytes = new Uint8Array(silentPcm.buffer);
      let silentBin = "";
      for (let i = 0; i < silentBytes.length; i++) silentBin += String.fromCharCode(silentBytes[i]);
      ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: btoa(silentBin) }));
      console.log("[EL-STT] Sent initial keepalive chunk");

      const source = ctx.createMediaStreamSource(stream);

      // Use AnalyserNode + interval to capture audio (more reliable than ScriptProcessorNode)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Also connect to a silent destination to keep the graph alive
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(ctx.destination);

      // Capture audio at ~62.5 fps (every 16ms) using a timer
      const captureSize = Math.floor(nativeRate * 0.064); // ~64ms of audio per chunk
      const downsampleRatio = nativeRate / 16000;

      captureIntervalRef.current = setInterval(() => {
        if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;

        // Get time-domain data from analyser
        const floatData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(floatData);

        // Downsample to 16kHz
        const targetLength = Math.floor(floatData.length / downsampleRatio);
        const pcm16 = new Int16Array(targetLength);
        for (let i = 0; i < targetLength; i++) {
          const sample = floatData[Math.floor(i * downsampleRatio)];
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        }

        // Encode to base64 safely
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

        ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: btoa(binary) }));
        chunksSentRef.current++;

        if (chunksSentRef.current % 50 === 0) {
          console.log(`[EL-STT] Sent ${chunksSentRef.current} chunks`);
        }
      }, 64); // ~15 chunks per second
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const msgType = msg.message_type || msg.type;

        if (msgType === "transcript_partial" || msgType === "partial_transcript") {
          setInterimTranscript(msg.text || "");
        } else if (msgType === "transcript_committed" || msgType === "committed_transcript") {
          const text = msg.text || "";
          if (text.trim()) {
            finalTranscriptRef.current += text + " ";
            setTranscript(finalTranscriptRef.current);
            setInterimTranscript("");
            console.log(`[EL-STT] Committed: "${text.trim().substring(0, 60)}"`);
          }
        } else if (msgType === "session_started") {
          console.log("[EL-STT] Session active");
        } else if (msgType === "error") {
          console.error("[EL-STT] Error:", msg.message || JSON.stringify(msg));
        } else {
          console.log(`[EL-STT] Received: ${msgType}`);
        }
      } catch {}
    };

    ws.onerror = () => console.error("[EL-STT] WebSocket error");

    ws.onclose = (event) => {
      console.log(`[EL-STT] Closed: code=${event.code} chunks=${chunksSentRef.current}`);
      setIsListening(false);
      activeRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = undefined; }
    if (contextRef.current) { contextRef.current.close().catch(() => {}); contextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
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
