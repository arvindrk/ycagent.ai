'use client';

import { useState, useEffect, useRef } from 'react';

type Phase = 'typing' | 'pausing' | 'deleting' | 'switching';

interface UseTypingAnimationOptions {
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  enabled?: boolean;
}

export function useTypingAnimation(
  phrases: string[],
  options: UseTypingAnimationOptions = {}
): string {
  const {
    typingSpeed = 100,
    deletingSpeed = 50,
    pauseDuration = 2000,
    enabled = true,
  } = options;

  const [currentText, setCurrentText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || phrases.length === 0) {
      setCurrentText('');
      return;
    }

    const currentPhrase = phrases[phraseIndex];

    if (phase === 'typing') {
      if (currentText.length < currentPhrase.length) {
        timeoutRef.current = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        setPhase('pausing');
      }
    } else if (phase === 'pausing') {
      timeoutRef.current = setTimeout(() => {
        setPhase('deleting');
      }, pauseDuration);
    } else if (phase === 'deleting') {
      if (currentText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, deletingSpeed);
      } else {
        setPhase('switching');
      }
    } else if (phase === 'switching') {
      timeoutRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setPhase('typing');
      }, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    currentText,
    phraseIndex,
    phase,
    phrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    enabled,
  ]);

  return currentText;
}
