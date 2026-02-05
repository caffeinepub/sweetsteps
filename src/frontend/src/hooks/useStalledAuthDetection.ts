import { useEffect, useState } from 'react';
import type { Status } from './useInternetIdentity';
import type { Identity } from '@icp-sdk/core/agent';
import type { AuthStep } from '../utils/authDiagnostics';

const DEFAULT_STALLED_TIMEOUT_MS = 2000; // 2 seconds for initial popup

export interface StalledAuthState {
  isStalled: boolean;
  timeoutReached: boolean;
  elapsedMs: number | null;
  configuredTimeoutMs: number;
  stalledStep?: AuthStep;
  stalledReason?: string;
}

interface StepTimeoutConfig {
  step: AuthStep;
  timeoutMs: number;
}

const STEP_TIMEOUTS: Record<string, number> = {
  'ii-initiation': 1000,        // 1s - fail fast if II doesn't start
  'ii-popup-open': 1500,        // 1.5s - fail fast if popup doesn't open
  'identity-validation': 2000,
  'actor-ready': 5000,
  'rbac-bootstrap': 8000,
  'onboarding-check': 8000,
};

/**
 * Enhanced stall detection hook that supports detecting stalls/slowdowns
 * for multiple auth pipeline steps with configurable thresholds
 */
export function useStalledAuthDetection(
  attemptTimestamp: number | null,
  loginStatus: Status,
  identity: Identity | undefined,
  currentStep?: AuthStep
): StalledAuthState {
  const [isStalled, setIsStalled] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [stalledStep, setStalledStep] = useState<AuthStep | undefined>(undefined);
  const [stalledReason, setStalledReason] = useState<string | undefined>(undefined);

  // Calculate elapsed time
  useEffect(() => {
    if (!attemptTimestamp) {
      setElapsedMs(null);
      return;
    }

    const updateElapsed = () => {
      setElapsedMs(Date.now() - attemptTimestamp);
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 100);

    return () => clearInterval(intervalId);
  }, [attemptTimestamp]);

  // Reset stall state when identity appears, error occurs, or status returns to idle
  useEffect(() => {
    if (identity || loginStatus === 'loginError' || loginStatus === 'success' || loginStatus === 'idle') {
      setIsStalled(false);
      setTimeoutReached(false);
      setStalledStep(undefined);
      setStalledReason(undefined);
      return;
    }

    // If no attempt is active, don't show stall
    if (!attemptTimestamp) {
      setIsStalled(false);
      setTimeoutReached(false);
      setStalledStep(undefined);
      setStalledReason(undefined);
      return;
    }

    // Determine timeout based on current step
    let timeoutMs = DEFAULT_STALLED_TIMEOUT_MS;
    let stepToCheck: AuthStep = 'ii-popup-open';

    if (currentStep && currentStep in STEP_TIMEOUTS) {
      timeoutMs = STEP_TIMEOUTS[currentStep];
      stepToCheck = currentStep;
    }

    // Start timeout to detect stalled auth
    const timeoutId = setTimeout(() => {
      // If still in non-terminal state after timeout, mark as stalled
      if (loginStatus === 'logging-in' && !identity) {
        setIsStalled(true);
        setTimeoutReached(true);
        setStalledStep(stepToCheck);
        setStalledReason(getReasonForStep(stepToCheck));
      }
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [attemptTimestamp, loginStatus, identity, currentStep]);

  const configuredTimeoutMs = currentStep && currentStep in STEP_TIMEOUTS
    ? STEP_TIMEOUTS[currentStep]
    : DEFAULT_STALLED_TIMEOUT_MS;

  return {
    isStalled,
    timeoutReached,
    elapsedMs,
    configuredTimeoutMs,
    stalledStep,
    stalledReason,
  };
}

function getReasonForStep(step: AuthStep): string {
  const reasons: Record<string, string> = {
    'ii-initiation': 'Internet Identity window did not open (popup may be blocked)',
    'ii-popup-open': 'Internet Identity window did not open (popup may be blocked)',
    'identity-validation': 'Identity validation is taking too long',
    'actor-ready': 'Backend connection is taking too long',
    'rbac-bootstrap': 'Permission initialization is taking too long',
    'onboarding-check': 'Account status check is taking too long',
  };
  return reasons[step] || 'Authentication is taking too long';
}

/**
 * Legacy export for backward compatibility
 */
export default function useStalledAuthDetectionLegacy(
  attemptTimestamp: number | null,
  loginStatus: Status,
  identity: Identity | undefined
): boolean {
  const state = useStalledAuthDetection(attemptTimestamp, loginStatus, identity);
  return state.isStalled;
}
