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
  
  // Guard to ensure auto-start runs at most once per hook instance
  const autoStartAttemptedRef = useRef(false);
  
  // Invocation counter for telemetry
  const invocationCountRef = useRef(0);
  
  // In-flight guard to prevent concurrent warmup calls
  const isWarmingRef = useRef(false);

  const warmup = useCallback(async () => {
    if (!actor) {
      console.log('[useCanisterWarmup] Actor not available, cannot warmup');
      return;
    }

    // Prevent concurrent warmup calls
    if (isWarmingRef.current) {
      console.log('[useCanisterWarmup] Warmup already in progress, skipping');
      return;
    }

    isWarmingRef.current = true;
    invocationCountRef.current += 1;
    const invocationId = invocationCountRef.current;

    console.log(`[useCanisterWarmup] Starting warmup #${invocationId}`);
    setState('warming');

    const timeoutId = setTimeout(() => {
      if (isWarmingRef.current) {
        console.warn(`[useCanisterWarmup] Warmup #${invocationId} timed out after ${WARMUP_TIMEOUT_MS}ms`);
        setState('failed');
        isWarmingRef.current = false;
      }
    }, WARMUP_TIMEOUT_MS);

    try {
      const result = await actor.ping();
      clearTimeout(timeoutId);
      
      if (result === true) {
        console.log(`[useCanisterWarmup] Warmup #${invocationId} succeeded`);
        setState('ready');
      } else {
        console.warn(`[useCanisterWarmup] Warmup #${invocationId} returned unexpected value:`, result);
        setState('failed');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[useCanisterWarmup] Warmup #${invocationId} failed:`, error);
      setState('failed');
    } finally {
      isWarmingRef.current = false;
    }
  }, [actor]);

  const retry = useCallback(() => {
    console.log('[useCanisterWarmup] Manual retry triggered');
    setState('idle');
    // Trigger warmup on next effect cycle
    setTimeout(() => warmup(), 0);
  }, [warmup]);

  // Auto-start warmup when actor is ready - runs at most once per hook instance
  useEffect(() => {
    if (autoStart && actor && !autoStartAttemptedRef.current && state === 'idle') {
      console.log('[useCanisterWarmup] Auto-start triggered');
      autoStartAttemptedRef.current = true;
      warmup();
    }
  }, [autoStart, actor, warmup, state]);

  return {
    state,
    retry,
    isWarming: state === 'warming',
    isReady: state === 'ready',
    isFailed: state === 'failed',
  };
}
