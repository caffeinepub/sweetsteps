import { useEffect, useState } from 'react';
import type { Status } from './useInternetIdentity';
import type { Identity } from '@icp-sdk/core/agent';

const STALLED_TIMEOUT_MS = 3000; // 3 seconds

/**
 * Hook that detects when an auth attempt has stalled (e.g., popup blocked).
 * After a user-initiated attempt, starts a timeout and exposes a boolean
 * to show help panel if auth has not reached a terminal state.
 */
export function useStalledAuthDetection(
  attemptTimestamp: number | null,
  loginStatus: Status,
  identity: Identity | undefined
) {
  const [showStalledHelp, setShowStalledHelp] = useState(false);

  useEffect(() => {
    // Reset help panel when identity appears or error occurs
    if (identity || loginStatus === 'loginError' || loginStatus === 'success') {
      setShowStalledHelp(false);
      return;
    }

    // If no attempt is active, don't show help
    if (!attemptTimestamp) {
      setShowStalledHelp(false);
      return;
    }

    // Start timeout to detect stalled auth
    const timeoutId = setTimeout(() => {
      // If still in non-terminal state after timeout, show help
      if (loginStatus === 'logging-in' && !identity) {
        setShowStalledHelp(true);
      }
    }, STALLED_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [attemptTimestamp, loginStatus, identity]);

  return showStalledHelp;
}
