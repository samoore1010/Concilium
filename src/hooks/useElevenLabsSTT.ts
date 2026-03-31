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
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
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
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/stt`;
    console.log("[EL-STT] Connecting via proxy...");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[EL-STT] Connected, setting up AudioWorklet...");
      setIsListening(true);
      chunksSentRef.current = 0;
      setupAudioPipeline(stream, ws);
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
          console.error("[EL-STT] Server:", JSON.stringify(msg));
        } else {
          console.log(`[EL-STT] ${msgType}`);
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

  async function setupAudioPipeline(stream: MediaStream, ws: WebSocket) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      contextRef.current = ctx;

      const nativeRate = ctx.sampleRate;
      console.log(`[EL-STT] Native rate: ${nativeRate}Hz`);

      // Try AudioWorklet first (modern, reliable), fall back to ScriptProcessor
      try {
        // Create an inline AudioWorklet processor
        const workletCode = `
          class PCMProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0];
              if (input.length > 0 && input[0].length > 0) {
                this.port.postMessage(input[0]);
              }
              return true;
            }
          }
          registerProcessor('pcm-processor', PCMProcessor);
        `;
        const blob = new Blob([workletCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
        workletRef.current = workletNode;

        const downsampleRatio = nativeRate / 16000;

        workletNode.port.onmessage = (e: MessageEvent) => {
          if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;

          const floatData: Float32Array = e.data;

          // Downsample to 16kHz
          let samples: Float32Array;
          if (downsampleRatio > 1.01) {
            const newLen = Math.floor(floatData.length / downsampleRatio);
            samples = new Float32Array(newLen);
            for (let i = 0; i < newLen; i++) {
              samples[i] = floatData[Math.floor(i * downsampleRatio)];
            }
          } else {
            samples = floatData;
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
            if (chunksSentRef.current === 1) console.log(`[EL-STT] First chunk via AudioWorklet: ${samples.length} samples`);
            if (chunksSentRef.current % 30 === 0) console.log(`[EL-STT] Chunks: ${chunksSentRef.current}`);
          } catch {}
        };

        source.connect(workletNode);
        workletNode.connect(ctx.destination); // Must connect to destination
        console.log("[EL-STT] Using AudioWorklet pipeline ✓");
        return;
      } catch (workletErr) {
        console.log("[EL-STT] AudioWorklet not available, trying ScriptProcessor...", workletErr);
      }

      // Fallback: ScriptProcessorNode
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const downsampleRatio = nativeRate / 16000;

      // MUST connect through to destination for Chrome
      source.connect(processor);
      processor.connect(ctx.destination);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
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

        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
        }

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
          if (chunksSentRef.current === 1) console.log(`[EL-STT] First chunk via ScriptProcessor: ${samples.length} samples`);
          if (chunksSentRef.current % 30 === 0) console.log(`[EL-STT] Chunks: ${chunksSentRef.current}`);
        } catch {}
      };

      console.log("[EL-STT] Using ScriptProcessor pipeline (fallback)");
    } catch (err) {
      console.error("[EL-STT] Audio pipeline setup failed:", err);
    }
  }

  const cleanup = useCallback(() => {
    if (workletRef.current) { try { workletRef.current.disconnect(); } catch {} workletRef.current = null; }
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
