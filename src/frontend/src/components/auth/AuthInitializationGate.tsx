import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useAuthStabilization } from '../../hooks/useAuthStabilization';
import { isSessionStale, isIdentityValid } from '../../utils/identityValidation';
import { AuthErrorPanel } from './AuthErrorPanel';
import { AUTH_GATE_CONFIG } from '../../config/authInitializationGateConfig';
import { Loader2 } from 'lucide-react';

interface AuthInitializationGateProps {
  children: React.ReactNode;
}

type GateState = 'loading' | 'ready' | 'timeout-error' | 'stale-session-error';

/**
 * Global auth initialization gate that blocks rendering of authenticated app shell
 * until Internet Identity settles, with deterministic timeout + user-visible retry.
 * 
 * This prevents the app from mounting and making canister calls before auth is ready,
 * and prevents transient routing decisions based on null identity during restoration.
 */
export function AuthInitializationGate({ children }: AuthInitializationGateProps) {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { isSettled, phase, blockingReason } = useAuthStabilization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [gateState, setGateState] = useState<GateState>('loading');
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const gateStartTimeRef = useRef<number>(Date.now());
  const hasTransitionedToReadyRef = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []);

  // Deterministic timeout: Start immediately when gate mounts in loading state
  useEffect(() => {
    if (gateState === 'loading' && !timeoutIdRef.current) {
      console.log('[AuthInitializationGate] Starting deterministic timeout timer');
      gateStartTimeRef.current = Date.now();
      
      timeoutIdRef.current = setTimeout(() => {
        const elapsed = Date.now() - gateStartTimeRef.current;
        console.error(
          `[AuthInitializationGate] Timeout reached after ${elapsed}ms - auth initialization took too long`,
          {
            isInitializing,
            isSettled,
            phase,
            hasIdentity: !!identity,
            identityAnonymous: identity?.getPrincipal().isAnonymous(),
          }
        );
        setGateState('timeout-error');
      }, AUTH_GATE_CONFIG.TIMEOUT_MS);
    }
  }, [gateState, isInitializing, isSettled, phase, identity]);

  // Main gate readiness logic with comprehensive logging
  useEffect(() => {
    // Prevent state oscillation - once we've transitioned to ready, don't go back
    if (hasTransitionedToReadyRef.current) {
      return;
    }

    // Log current blocking reason from stabilization hook
    if (blockingReason) {
      console.log(`[AuthInitializationGate] Blocking: ${blockingReason} (phase: ${phase})`);
      return;
    }

    // Wait for stabilization to complete
    if (!isSettled) {
      console.log(`[AuthInitializationGate] Blocking: Waiting for auth to settle (phase: ${phase})`);
      return;
    }

    // At this point: initialization complete AND stabilization settled
    const elapsed = Date.now() - gateStartTimeRef.current;
    console.log(`[AuthInitializationGate] Auth settled after ${elapsed}ms (phase: ${phase})`);

    // Check for stale/invalid identity
    if (identity) {
      if (identity.getPrincipal().isAnonymous()) {
        console.warn('[AuthInitializationGate] Identity is anonymous - treating as stale session');
        setGateState('stale-session-error');
        return;
      }

      if (isSessionStale(identity)) {
        console.error('[AuthInitializationGate] Stale session detected (delegation expired)');
        setGateState('stale-session-error');
        return;
      }

      if (!isIdentityValid(identity)) {
        console.error('[AuthInitializationGate] Invalid identity detected');
        setGateState('stale-session-error');
        return;
      }

      console.log('[AuthInitializationGate] Valid authenticated identity present');
    } else {
      console.log('[AuthInitializationGate] No identity present (user not logged in)');
    }

    // Clear timeout - we're ready
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
      console.log('[AuthInitializationGate] Timeout cleared - gate is ready');
    }

    // Transition to ready state
    console.log('[AuthInitializationGate] ✓ Auth gate ready - rendering children');
    hasTransitionedToReadyRef.current = true;
    setGateState('ready');
  }, [isSettled, phase, blockingReason, identity]);

  // Retry handler for timeout error
  const handleTimeoutRetry = useCallback(() => {
    console.log('[AuthInitializationGate] User triggered retry after timeout - reloading app');
    // Clear any stale state
    queryClient.clear();
    // Reload the app to restart auth initialization
    window.location.reload();
  }, [queryClient]);

  // Retry handler for stale session error
  const handleStaleSessionRetry = useCallback(async () => {
    console.log('[AuthInitializationGate] User triggered stale session retry - clearing identity and redirecting');
    try {
      // Clear the stale identity
      await clear();
      // Clear all cached data
      queryClient.clear();
      // Navigate to landing page
      navigate({ to: '/' });
    } catch (error) {
      console.error('[AuthInitializationGate] Error during stale session retry:', error);
      // Fallback: force reload
      window.location.href = '/';
    }
  }, [clear, queryClient, navigate]);

  // Return to landing handler
  const handleReturnToLanding = useCallback(() => {
    console.log('[AuthInitializationGate] User chose to return to landing');
    navigate({ to: '/' });
  }, [navigate]);

  // Render based on gate state
  if (gateState === 'timeout-error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <AuthErrorPanel
            message={AUTH_GATE_CONFIG.TIMEOUT_ERROR_MESSAGE}
            onRetry={handleTimeoutRetry}
            onReturnToLanding={handleReturnToLanding}
          />
        </div>
      </div>
    );
  }

  if (gateState === 'stale-session-error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <AuthErrorPanel
            message={AUTH_GATE_CONFIG.STALE_SESSION_ERROR_MESSAGE}
            onRetry={handleStaleSessionRetry}
            onReturnToLanding={handleReturnToLanding}
          />
        </div>
      </div>
    );
  }

  if (gateState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{AUTH_GATE_CONFIG.LOADING_MESSAGE}</p>
        </div>
      </div>
    );
  }

  // Gate is ready - render children
  return <>{children}</>;
}
