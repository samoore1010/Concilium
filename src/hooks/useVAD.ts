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
  const rafRef = useRef<number>(0);
  const silenceStartRef = useRef<number>(0);
  const callbackRef = useRef<(() => void) | null>(null);
  const firedRef = useRef(false);
  const activeRef = useRef(false);

  const VOLUME_THRESHOLD = 8; // below this = silence

  const onSilenceThreshold = useCallback((callback: () => void) => {
    callbackRef.current = callback;
  }, []);

  const resetSilenceTimer = useCallback(() => {
    silenceStartRef.current = Date.now();
    firedRef.current = false;
    setSilenceDurationMs(0);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      activeRef.current = true;
      resetSilenceTimer();

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!activeRef.current) return;
        analyser.getByteTimeDomainData(buffer);

        // RMS volume
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(100, Math.round(rms * 300));

        const now = Date.now();

        if (volume > VOLUME_THRESHOLD) {
          // User is speaking
          setIsSpeaking(true);
          resetSilenceTimer();
        } else {
          // Silence
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
    } catch (err) {
      console.error("[VAD] Failed to start:", err);
    }
  }, [silenceThresholdMs, resetSilenceTimer]);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current.mediaStream.getTracks().forEach((t) => t.stop());
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
    setSilenceDurationMs(0);
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { isSpeaking, silenceDurationMs, start, stop, onSilenceThreshold };
}
