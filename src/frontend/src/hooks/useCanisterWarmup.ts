import { useEffect, useState, useCallback, useRef } from 'react';
import { useActor } from './useActor';

type WarmupState = 'idle' | 'warming' | 'ready' | 'failed';

interface UseCanisterWarmupResult {
  state: WarmupState;
  retry: () => void;
  isWarming: boolean;
  isReady: boolean;
  isFailed: boolean;
}

const WARMUP_TIMEOUT_MS = 30000; // 30 seconds

export function useCanisterWarmup(autoStart: boolean = false): UseCanisterWarmupResult {
  const { actor } = useActor();
  const [state, setState] = useState<WarmupState>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Guard to ensure auto-start runs at most once per hook instance
  const autoStartAttemptedRef = useRef(false);
  
  // Invocation counter for telemetry
  const invocationCountRef = useRef(0);
  
  // In-flight guard to prevent concurrent warmup calls
  const isWarmingRef = useRef(false);

  const warmup = useCallback(async () => {
    // Block if already warming
    if (isWarmingRef.current) {
      console.warn('[useCanisterWarmup] Warmup already in progress, blocking duplicate invocation');
      invocationCountRef.current++;
      return;
    }

    // Block if no actor or already ready
    if (!actor || state === 'ready') {
      return;
    }

    // Log invocation
    invocationCountRef.current++;
    console.log(`[useCanisterWarmup] Starting warmup attempt #${invocationCountRef.current}`);

    // Set in-flight guard
    isWarmingRef.current = true;

    // Create abort controller for this attempt
    abortControllerRef.current = new AbortController();
    setState('warming');

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setState('failed');
      isWarmingRef.current = false;
      console.warn('[useCanisterWarmup] Warmup timed out after 30s');
    }, WARMUP_TIMEOUT_MS);

    try {
      await actor.warmup();
      
      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Check if we were aborted
      if (abortControllerRef.current?.signal.aborted) {
        isWarmingRef.current = false;
        return;
      }

      setState('ready');
      isWarmingRef.current = false;
      console.log('[useCanisterWarmup] Warmup completed successfully');
    } catch (error) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Check if this was an abort
      if (abortControllerRef.current?.signal.aborted) {
        isWarmingRef.current = false;
        return;
      }

      console.error('[useCanisterWarmup] Warmup failed:', error);
      setState('failed');
      isWarmingRef.current = false;
    } finally {
      abortControllerRef.current = null;
    }
  }, [actor]); // Removed 'state' from dependencies to prevent loop

  const retry = useCallback(() => {
    // Cancel any in-flight warmup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear in-flight guard
    isWarmingRef.current = false;

    setState('idle');
    console.log('[useCanisterWarmup] Manual retry triggered');
    // Trigger warmup on next tick
    setTimeout(() => warmup(), 0);
  }, [warmup]);

  // Auto-start warmup when actor is ready - runs at most once per hook instance
  useEffect(() => {
    if (autoStart && actor && !autoStartAttemptedRef.current) {
      console.log('[useCanisterWarmup] Auto-start triggered');
      autoStartAttemptedRef.current = true;
      warmup();
    }
  }, [autoStart, actor, warmup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isWarmingRef.current = false;
    };
  }, []);

  return {
    state,
    retry,
    isWarming: state === 'warming',
    isReady: state === 'ready',
    isFailed: state === 'failed',
  };
}
