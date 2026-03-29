import { useState, useCallback } from "react";

export interface SpeechMetrics {
  wordsPerMinute: number;
  fillerWordCount: number;
  longestPause: number;
  vocabularyScore: number;
}

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "actually",
  "sort of",
  "kind of",
  "really",
  "literally",
  "honestly",
  "actually",
  "i mean",
  "you know what",
];

export function useSpeechMetrics() {
  const [metrics, setMetrics] = useState<SpeechMetrics>({
    wordsPerMinute: 0,
    fillerWordCount: 0,
    longestPause: 0,
    vocabularyScore: 0,
  });
  const [startTime] = useState(Date.now());
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());
  const [allWords, setAllWords] = useState<string[]>([]);
  const [uniqueWords, setUniqueWords] = useState<Set<string>>(new Set());

  const updateMetrics = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const words = text.toLowerCase().split(/\s+/).filter(Boolean);
      const now = Date.now();
      const pauseTime = (now - lastMessageTime) / 1000; // in seconds

      // Count filler words
      const fillerCount = words.filter((word) => {
        const normalizedWord = word.replace(/[.,!?;:]/g, "");
        return FILLER_WORDS.some((filler) => normalizedWord.includes(filler));
      }).length;

      // Calculate WPM
      const elapsedMinutes = (now - startTime) / 60000;
      const totalWords = allWords.length + words.length;
      const wpm = elapsedMinutes > 0 ? Math.round(totalWords / elapsedMinutes) : 0;

      // Update unique words
      const newUnique = new Set(uniqueWords);
      words.forEach((word) => {
        const cleaned = word.replace(/[.,!?;:]/g, "");
        if (cleaned.length > 0) newUnique.add(cleaned);
      });

      // Calculate vocabulary score
      const vocabScore = totalWords > 0 ? Math.round((newUnique.size / totalWords) * 100) : 0;

      setMetrics((prev) => ({
        wordsPerMinute: wpm,
        fillerWordCount: prev.fillerWordCount + fillerCount,
        longestPause: Math.max(prev.longestPause, Math.round(pauseTime * 10) / 10),
        vocabularyScore: Math.min(100, vocabScore),
      }));

      setAllWords((prev) => [...prev, ...words]);
      setUniqueWords(newUnique);
      setLastMessageTime(now);
    },
    [allWords, uniqueWords, startTime, lastMessageTime]
  );

  return { metrics, updateMetrics };
}
