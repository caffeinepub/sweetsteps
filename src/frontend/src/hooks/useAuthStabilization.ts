import { useState, useEffect } from 'react';
import { useInternetIdentity } from './useInternetIdentity';

/**
 * Hook that provides a stable auth signal for routing decisions.
 * Waits for Internet Identity initialization to complete and applies
 * a short stabilization window before treating identity as definitively absent.
 * This prevents transient redirects during identity restoration.
 */
export function useAuthStabilization() {
  const { identity, isInitializing } = useInternetIdentity();
  const [isStabilized, setIsStabilized] = useState(false);

  useEffect(() => {
    // If still initializing, not yet stabilized
    if (isInitializing) {
      setIsStabilized(false);
      return;
    }

    // Once initialization completes, wait a brief moment for identity to settle
    // This handles cases where identity might be temporarily null during restoration
    const stabilizationTimer = setTimeout(() => {
      setIsStabilized(true);
    }, 100); // 100ms stabilization window

    return () => clearTimeout(stabilizationTimer);
  }, [isInitializing]);

  return {
    isAuthStabilized: isStabilized,
    isAuthenticated: !!identity,
    identity,
    isInitializing,
  };
}
