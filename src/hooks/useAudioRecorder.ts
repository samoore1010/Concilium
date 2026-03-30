import { useState, useRef, useCallback, useEffect } from "react";

export interface RecordingData {
  blob: Blob | null;
  url: string;
  duration: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => RecordingData;
  getRecording: () => RecordingData;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef("");

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Choose best available format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4"; // iOS Safari fallback

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      chunksRef.current = [];
      blobRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log(`[Recorder] Started (${mimeType})`);
    } catch (err) {
      console.error("[Recorder] Failed to start:", err);
    }
  }, []);

  const stopRecording = useCallback((): RecordingData => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType });
      const url = URL.createObjectURL(blob);
      const duration = (Date.now() - startTimeRef.current) / 1000;

      blobRef.current = blob;
      urlRef.current = url;
      mediaRecorderRef.current = null;
      setIsRecording(false);

      console.log(`[Recorder] Stopped: ${(blob.size / 1024).toFixed(1)}KB, ${duration.toFixed(1)}s`);
      return { blob, url, duration };
    }
    return { blob: null, url: "", duration: 0 };
  }, []);

  const getRecording = useCallback((): RecordingData => {
    return {
      blob: blobRef.current,
      url: urlRef.current,
      duration: startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return { isRecording, startRecording, stopRecording, getRecording };
}
