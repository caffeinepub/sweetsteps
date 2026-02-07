import { useState, useEffect, useRef } from 'react';
import { useInternetIdentity } from './useInternetIdentity';
import { hasIIReturnEvidence, getIIReturnEvidenceReason } from '../utils/iiReturnDetection';

/**
 * Stabilization phase states
 */
type StabilizationPhase = 
  | 'initializing'           // II is still initializing
  | 'settling'               // Waiting for identity to settle after initialization
  | 'settled-authenticated'  // Identity is present and valid
  | 'settled-unauthenticated'; // No identity after settle window

/**
 * Hook that provides a stable auth signal for routing decisions.
 * Uses a deterministic state machine to wait for Internet Identity initialization
 * and identity restoration to complete before treating auth state as settled.
 * This prevents transient redirects during identity restoration after II OAuth flow.
 */
export function useAuthStabilization() {
  const { identity, isInitializing } = useInternetIdentity();
  const [phase, setPhase] = useState<StabilizationPhase>('initializing');
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartTimeRef = useRef<number>(Date.now());

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Phase 1: Initializing - wait for II to finish initialization
    if (isInitializing) {
      if (phase !== 'initializing') {
        console.log('[Auth Stabilization] Phase: initializing (II is loading)');
        phaseStartTimeRef.current = Date.now();
        setPhase('initializing');
      }
      return;
    }

    // Phase 2: Settling - II initialization complete, now wait for identity to settle
    if (phase === 'initializing') {
      console.log('[Auth Stabilization] Phase: settling (waiting for identity restoration)');
      phaseStartTimeRef.current = Date.now();
      setPhase('settling');

      // Determine settle window based on II return evidence
      const hasEvidence = hasIIReturnEvidence();
      const evidenceReason = getIIReturnEvidenceReason();
      
      // If returning from II, use longer settle window to allow restoration
      // Otherwise use short window since identity should be immediately available
      const settleWindowMs = hasEvidence ? 1500 : 300;
      
      if (hasEvidence) {
        console.log(`[Auth Stabilization] II return evidence detected (${evidenceReason}) - using ${settleWindowMs}ms settle window`);
      } else {
        console.log(`[Auth Stabilization] No II return evidence - using ${settleWindowMs}ms settle window`);
      }

      // Clear any existing timer
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }

      // Start settle timer
      settleTimerRef.current = setTimeout(() => {
        const elapsed = Date.now() - phaseStartTimeRef.current;
        
        if (identity && !identity.getPrincipal().isAnonymous()) {
          console.log(`[Auth Stabilization] Phase: settled-authenticated after ${elapsed}ms`);
          setPhase('settled-authenticated');
        } else {
          console.log(`[Auth Stabilization] Phase: settled-unauthenticated after ${elapsed}ms (no valid identity found)`);
          setPhase('settled-unauthenticated');
        }
        
        settleTimerRef.current = null;
      }, settleWindowMs);

      return;
    }

    // Phase 3: Check if identity appeared during settling phase
    if (phase === 'settling') {
      // If we get a valid identity during the settling phase, transition immediately
      if (identity && !identity.getPrincipal().isAnonymous()) {
        const elapsed = Date.now() - phaseStartTimeRef.current;
        console.log(`[Auth Stabilization] Identity appeared during settling phase after ${elapsed}ms - transitioning to settled-authenticated`);
        
        // Clear the settle timer since we don't need to wait anymore
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        
        setPhase('settled-authenticated');
      }
      return;
    }

    // Phase 4: Already settled - monitor for identity changes
    if (phase === 'settled-authenticated' || phase === 'settled-unauthenticated') {
      const hasValidIdentity = identity && !identity.getPrincipal().isAnonymous();
      
      // If state changed, log it but don't transition (prevents flicker)
      if (phase === 'settled-authenticated' && !hasValidIdentity) {
        console.warn('[Auth Stabilization] Identity lost after settling - keeping settled-authenticated to prevent flicker');
      } else if (phase === 'settled-unauthenticated' && hasValidIdentity) {
        console.log('[Auth Stabilization] Identity appeared after settling as unauthenticated - transitioning to settled-authenticated');
        setPhase('settled-authenticated');
      }
    }
  }, [isInitializing, identity, phase]);

  // Compute derived states
  const isSettled = phase === 'settled-authenticated' || phase === 'settled-unauthenticated';
  const isAuthenticated = phase === 'settled-authenticated';
  const blockingReason = 
    phase === 'initializing' ? 'Internet Identity is initializing' :
    phase === 'settling' ? 'Waiting for identity restoration to settle' :
    null;

  return {
    // Legacy compatibility
    isAuthStabilized: isSettled,
    isAuthenticated,
    identity,
    isInitializing,
    
    // New detailed state
    phase,
    isSettled,
    settledOutcome: isSettled ? (isAuthenticated ? 'authenticated' : 'unauthenticated') : null,
    blockingReason,
  };
}
