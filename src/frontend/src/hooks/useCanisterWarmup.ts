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
  const [state, setState] = useState<WarmupState>('ready'); // Always ready since no warmup needed
  
  // Guard to ensure auto-start runs at most once per hook instance
  const autoStartAttemptedRef = useRef(false);
  
  // Invocation counter for telemetry
  const invocationCountRef = useRef(0);
  
  // In-flight guard to prevent concurrent warmup calls
  const isWarmingRef = useRef(false);

  const warmup = useCallback(async () => {
    // No-op: Backend no longer has warmup method
    // Just mark as ready immediately when actor is available
    if (actor) {
      setState('ready');
      console.log('[useCanisterWarmup] Actor ready (no warmup needed)');
    }
  }, [actor]);

  const retry = useCallback(() => {
    console.log('[useCanisterWarmup] Manual retry triggered');
    setState('ready');
  }, []);

  // Auto-start warmup when actor is ready - runs at most once per hook instance
  useEffect(() => {
    if (autoStart && actor && !autoStartAttemptedRef.current) {
      console.log('[useCanisterWarmup] Auto-start triggered');
      autoStartAttemptedRef.current = true;
      warmup();
    }
  }, [autoStart, actor, warmup]);

  return {
    state,
    retry,
    isWarming: state === 'warming',
    isReady: state === 'ready',
    isFailed: state === 'failed',
  };
}
