import { useRef, useState, useCallback, useEffect } from "react";

interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  supported: boolean;
  attachVideo: (el: HTMLVideoElement | null) => void;
}

export function useCamera(): UseCameraReturn {
  const [isActive, setIsActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const videoElementsRef = useRef<Set<HTMLVideoElement>>(new Set());

  useEffect(() => {
    setSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  // Attach stream to all registered video elements
  const syncStream = useCallback(() => {
    videoElementsRef.current.forEach((el) => {
      if (streamRef.current && el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
    });
  }, []);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      videoElementsRef.current.add(el);
      if (streamRef.current) {
        el.srcObject = streamRef.current;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsActive(true);
      // Attach to any already-rendered video elements
      setTimeout(syncStream, 50);
    } catch (error) {
      console.error("Failed to access camera:", error);
    }
  }, [supported, syncStream]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsActive(false);
      videoElementsRef.current.forEach((el) => { el.srcObject = null; });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream: streamRef.current,
    isActive,
    startCamera,
    stopCamera,
    supported,
    attachVideo,
  };
}
