import { useCallback, useRef, useState } from 'react';

/**
 * Hook to manage a user-initiated auth attempt lifecycle.
 * Provides immediate UI feedback flag, re-entrancy guard, attempt timestamp,
 * correlation ID support, and enhanced recovery semantics for stalled flows.
 */
export function useAuthAttemptGuard() {
  const [isAttempting, setIsAttempting] = useState(false);
  const attemptTimestampRef = useRef<number | null>(null);
  const correlationIdRef = useRef<string | null>(null);

  const startAttempt = useCallback((correlationId?: string) => {
    if (isAttempting) {
      // Already attempting, ignore
      return false;
    }
    setIsAttempting(true);
    attemptTimestampRef.current = Date.now();
    correlationIdRef.current = correlationId || null;
    return true;
  }, [isAttempting]);

  const endAttempt = useCallback(() => {
    setIsAttempting(false);
    attemptTimestampRef.current = null;
    correlationIdRef.current = null;
  }, []);

  const getAttemptTimestamp = useCallback(() => {
    return attemptTimestampRef.current;
  }, []);

  const getCorrelationId = useCallback(() => {
    return correlationIdRef.current;
  }, []);

  /**
   * Get elapsed time since attempt started (in milliseconds)
   */
  const getElapsedMs = useCallback(() => {
    if (!attemptTimestampRef.current) return null;
    return Date.now() - attemptTimestampRef.current;
  }, []);

  /**
   * Force reset the attempt guard (for recovery scenarios)
   */
  const forceReset = useCallback(() => {
    setIsAttempting(false);
    attemptTimestampRef.current = null;
    correlationIdRef.current = null;
  }, []);

  return {
    isAttempting,
    startAttempt,
    endAttempt,
    getAttemptTimestamp,
    getCorrelationId,
    getElapsedMs,
    forceReset,
  };
}
