import { useState, useRef, useCallback, useEffect } from "react";

export interface RecordingData {
  blob: Blob | null;
  url: string;
  duration: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingData>;
  getRecording: () => RecordingData;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef("");
  const mimeTypeRef = useRef("");

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });

      chunksRef.current = [];
      blobRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
      mimeTypeRef.current = mimeType;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(500); // Collect data every 500ms for more granular chunks
      startTimeRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log(`[Recorder] Started (${mimeType})`);
    } catch (err) {
      console.error("[Recorder] Failed to start:", err);
    }
  }, []);

  // Stop recording and wait for all data to be flushed
  const stopRecording = useCallback((): Promise<RecordingData> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve({ blob: null, url: "", duration: 0 });
        return;
      }

      const duration = (Date.now() - startTimeRef.current) / 1000;

      // Wait for the onstop event which fires AFTER all ondataavailable events
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const url = URL.createObjectURL(blob);

        blobRef.current = blob;
        urlRef.current = url;
        mediaRecorderRef.current = null;
        setIsRecording(false);

        console.log(`[Recorder] Stopped: ${(blob.size / 1024).toFixed(1)}KB, ${duration.toFixed(1)}s, ${chunksRef.current.length} chunks`);
        resolve({ blob, url, duration });
      };

      // Stop the recorder and its stream
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });
  }, []);

  const getRecording = useCallback((): RecordingData => {
    return {
      blob: blobRef.current,
      url: urlRef.current,
      duration: startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0,
    };
  }, []);

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
