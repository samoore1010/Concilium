import { useRef, useState, useCallback, useEffect } from "react";

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  supported: boolean;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSupported(hasGetUserMedia);
  }, []);

  // Attach the stream to the video element whenever the ref or active state changes
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isActive]);

  const startCamera = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsActive(true);
    } catch (error) {
      console.error("Failed to access camera:", error);
    }
  }, [supported]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsActive(false);
    }
  }, []);

  return {
    videoRef,
    isActive,
    startCamera,
    stopCamera,
    supported,
  };
}
