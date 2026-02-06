import { useCallback, useRef, useState } from 'react';

const USER_INITIATED_AUTH_KEY = 'sweetsteps_user_initiated_auth';

/**
 * Hook to manage a user-initiated auth attempt lifecycle.
 * Provides immediate UI feedback flag, re-entrancy guard, attempt timestamp,
 * correlation ID support, and enhanced recovery semantics for stalled flows.
 * Sets sessionStorage flag to track user-initiated auth for current visit.
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
    
    // CRITICAL: Set sessionStorage flag to indicate user initiated auth
    sessionStorage.setItem(USER_INITIATED_AUTH_KEY, 'true');
    
    return true;
  }, [isAttempting]);

  const endAttempt = useCallback(() => {
    setIsAttempting(false);
    attemptTimestampRef.current = null;
    correlationIdRef.current = null;
    // Note: We do NOT clear the sessionStorage flag here
    // It persists for the entire visit to allow callback handler to work
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
    // Note: We do NOT clear the sessionStorage flag here
    // It persists for the entire visit
  }, []);

  /**
   * Check if user has initiated auth in the current visit
   */
  const hasUserInitiatedAuth = useCallback(() => {
    return sessionStorage.getItem(USER_INITIATED_AUTH_KEY) === 'true';
  }, []);

  return {
    isAttempting,
    startAttempt,
    endAttempt,
    getAttemptTimestamp,
    getCorrelationId,
    getElapsedMs,
    forceReset,
    hasUserInitiatedAuth,
  };
}
