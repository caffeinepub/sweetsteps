import { useCallback, useRef, useState } from 'react';

/**
 * Hook to manage a user-initiated auth attempt lifecycle.
 * Provides immediate UI feedback flag, re-entrancy guard, and attempt timestamp.
 */
export function useAuthAttemptGuard() {
  const [isAttempting, setIsAttempting] = useState(false);
  const attemptTimestampRef = useRef<number | null>(null);

  const startAttempt = useCallback(() => {
    if (isAttempting) {
      // Already attempting, ignore
      return false;
    }
    setIsAttempting(true);
    attemptTimestampRef.current = Date.now();
    return true;
  }, [isAttempting]);

  const endAttempt = useCallback(() => {
    setIsAttempting(false);
    attemptTimestampRef.current = null;
  }, []);

  const getAttemptTimestamp = useCallback(() => {
    return attemptTimestampRef.current;
  }, []);

  return {
    isAttempting,
    startAttempt,
    endAttempt,
    getAttemptTimestamp,
  };
}
