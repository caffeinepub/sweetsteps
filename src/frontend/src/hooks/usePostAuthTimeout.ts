import { useEffect, useRef, useState, useCallback } from 'react';

export type PostAuthPhase = 'validation' | 'actor-ready' | 'onboarding-check';

interface UsePostAuthTimeoutOptions {
  phase: PostAuthPhase | null;
  timeoutMs?: number;
  onTimeout: () => void;
}

interface UsePostAuthTimeoutReturn {
  isTimedOut: boolean;
  elapsedMs: number;
  reset: () => void;
}

const DEFAULT_TIMEOUTS: Record<PostAuthPhase, number> = {
  validation: 10000, // 10 seconds
  'actor-ready': 15000, // 15 seconds
  'onboarding-check': 10000, // 10 seconds
};

/**
 * Hook that starts a timer for designated post-II phases and returns
 * a terminal timeout state plus reset/retry helpers
 */
export function usePostAuthTimeout({
  phase,
  timeoutMs,
  onTimeout,
}: UsePostAuthTimeoutOptions): UsePostAuthTimeoutReturn {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setIsTimedOut(false);
    setElapsedMs(0);
    startTimeRef.current = null;

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Clear any existing timers
    reset();

    // Only start timer if we have an active phase
    if (!phase) {
      return;
    }

    const timeout = timeoutMs ?? DEFAULT_TIMEOUTS[phase];
    startTimeRef.current = Date.now();

    // Start elapsed time tracker
    intervalIdRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);

    // Start timeout timer
    timeoutIdRef.current = setTimeout(() => {
      setIsTimedOut(true);
      onTimeout();
    }, timeout);

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [phase, timeoutMs, onTimeout, reset]);

  return {
    isTimedOut,
    elapsedMs,
    reset,
  };
}
