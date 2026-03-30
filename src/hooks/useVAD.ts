import { useState, useRef, useCallback, useEffect } from "react";

interface UseVADReturn {
  isSpeaking: boolean;
  silenceDurationMs: number;
  start: () => Promise<void>;
  stop: () => void;
  onSilenceThreshold: (callback: () => void) => void;
}

export function useVAD(silenceThresholdMs: number = 2500): UseVADReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceDurationMs, setSilenceDurationMs] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const silenceStartRef = useRef<number>(Date.now());
  const callbackRef = useRef<(() => void) | null>(null);
  const firedRef = useRef(false);
  const activeRef = useRef(false);

  const VOLUME_THRESHOLD = 8;

  const onSilenceThreshold = useCallback((callback: () => void) => {
    callbackRef.current = callback;
  }, []);

  const start = useCallback(async () => {
    try {
      // Request audio — this MUST be called from a user gesture on mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Create AudioContext — also needs user gesture on some mobile browsers
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Resume if suspended (mobile Safari requires this)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      activeRef.current = true;
      silenceStartRef.current = Date.now();
      firedRef.current = false;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!activeRef.current) return;

        analyser.getByteTimeDomainData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(100, Math.round(rms * 300));

        const now = Date.now();

        if (volume > VOLUME_THRESHOLD) {
          setIsSpeaking(true);
          silenceStartRef.current = now;
          firedRef.current = false;
          setSilenceDurationMs(0);
        } else {
          setIsSpeaking(false);
          const elapsed = now - silenceStartRef.current;
          setSilenceDurationMs(elapsed);

          if (elapsed >= silenceThresholdMs && !firedRef.current) {
            firedRef.current = true;
            callbackRef.current?.();
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      console.log("[VAD] Started successfully");
    } catch (err) {
      console.error("[VAD] Failed to start:", err);
    }
  }, [silenceThresholdMs]);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
    setSilenceDurationMs(0);
    console.log("[VAD] Stopped");
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return { isSpeaking, silenceDurationMs, start, stop, onSilenceThreshold };
}
