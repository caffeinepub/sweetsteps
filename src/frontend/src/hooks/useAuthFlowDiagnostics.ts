import { useState, useCallback, useRef, useEffect } from 'react';
import type { Identity } from '@icp-sdk/core/agent';
import type { Status } from './useInternetIdentity';
import {
  generateCorrelationId,
  logStep,
  logStepTransition,
  logTerminalOutcome,
  logSlowStep,
  getStepLabel,
  type AuthStep,
  type AuthStepTiming,
} from '../utils/authDiagnostics';

export interface AuthFlowState {
  correlationId: string | null;
  currentStep: AuthStep;
  stepLabel: string;
  startTime: number | null;
  elapsedMs: number | null;
  steps: AuthStepTiming[];
  outcome: 'success' | 'error' | 'stalled' | null;
  outcomeMessage: string | null;
  slowStep: { step: AuthStep; duration: number } | null;
}

interface StepThresholds {
  'identity-validation': number;
  'actor-ready': number;
  'rbac-bootstrap': number;
  'onboarding-check': number;
}

const DEFAULT_THRESHOLDS: StepThresholds = {
  'identity-validation': 2000,
  'actor-ready': 3000,
  'rbac-bootstrap': 5000,
  'onboarding-check': 5000,
};

/**
 * Orchestrator hook for auth flow diagnostics
 * Maps the auth pipeline into explicit step states with timing and logging
 */
export function useAuthFlowDiagnostics() {
  const [state, setState] = useState<AuthFlowState>({
    correlationId: null,
    currentStep: 'idle',
    stepLabel: getStepLabel('idle'),
    startTime: null,
    elapsedMs: null,
    steps: [],
    outcome: null,
    outcomeMessage: null,
    slowStep: null,
  });

  const stepStartTimeRef = useRef<number | null>(null);
  const thresholdsRef = useRef<StepThresholds>(DEFAULT_THRESHOLDS);

  // Update elapsed time
  useEffect(() => {
    if (!state.startTime) {
      return;
    }

    const intervalId = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedMs: Date.now() - (prev.startTime || 0),
      }));
    }, 100);

    return () => clearInterval(intervalId);
  }, [state.startTime]);

  /**
   * Start a new auth attempt
   */
  const startAttempt = useCallback(() => {
    const correlationId = generateCorrelationId();
    const now = Date.now();

    setState({
      correlationId,
      currentStep: 'click',
      stepLabel: getStepLabel('click'),
      startTime: now,
      elapsedMs: 0,
      steps: [{ step: 'click', startTime: now }],
      outcome: null,
      outcomeMessage: null,
      slowStep: null,
    });

    stepStartTimeRef.current = now;
    logStep(correlationId, 'click');

    return correlationId;
  }, []);

  /**
   * Transition to a new step
   */
  const transitionStep = useCallback((newStep: AuthStep, metadata?: Record<string, any>) => {
    setState((prev) => {
      if (!prev.correlationId || !prev.startTime) {
        console.warn('Cannot transition step: no active attempt');
        return prev;
      }

      const now = Date.now();
      const stepDuration = stepStartTimeRef.current ? now - stepStartTimeRef.current : undefined;

      // Complete previous step
      const updatedSteps = [...prev.steps];
      const lastStep = updatedSteps[updatedSteps.length - 1];
      if (lastStep && !lastStep.endTime) {
        lastStep.endTime = now;
        lastStep.duration = stepDuration;
        lastStep.metadata = metadata;
      }

      // Check for slow step
      let slowStep = prev.slowStep;
      if (
        stepDuration !== undefined &&
        lastStep &&
        lastStep.step in thresholdsRef.current
      ) {
        const threshold = thresholdsRef.current[lastStep.step as keyof StepThresholds];
        if (stepDuration > threshold) {
          slowStep = { step: lastStep.step, duration: stepDuration };
          logSlowStep(prev.correlationId, lastStep.step, stepDuration, threshold);
        }
      }

      // Add new step
      updatedSteps.push({ step: newStep, startTime: now });
      stepStartTimeRef.current = now;

      logStepTransition(prev.correlationId, prev.currentStep, newStep, stepDuration);

      return {
        ...prev,
        currentStep: newStep,
        stepLabel: getStepLabel(newStep),
        steps: updatedSteps,
        elapsedMs: now - prev.startTime,
        slowStep,
      };
    });
  }, []);

  /**
   * Mark attempt as complete with outcome
   */
  const completeAttempt = useCallback(
    (outcome: 'success' | 'error' | 'stalled', message?: string) => {
      setState((prev) => {
        if (!prev.correlationId || !prev.startTime) {
          return prev;
        }

        const now = Date.now();
        const totalDuration = now - prev.startTime;

        // Complete final step
        const updatedSteps = [...prev.steps];
        const lastStep = updatedSteps[updatedSteps.length - 1];
        if (lastStep && !lastStep.endTime) {
          lastStep.endTime = now;
          lastStep.duration = stepStartTimeRef.current ? now - stepStartTimeRef.current : undefined;
        }

        logTerminalOutcome(prev.correlationId, outcome, totalDuration, message);

        return {
          ...prev,
          currentStep: outcome === 'success' ? 'success' : outcome === 'error' ? 'error' : 'stalled',
          stepLabel: getStepLabel(outcome === 'success' ? 'success' : outcome === 'error' ? 'error' : 'stalled'),
          steps: updatedSteps,
          outcome,
          outcomeMessage: message || null,
          elapsedMs: totalDuration,
        };
      });
    },
    []
  );

  /**
   * Reset to idle
   */
  const reset = useCallback(() => {
    setState({
      correlationId: null,
      currentStep: 'idle',
      stepLabel: getStepLabel('idle'),
      startTime: null,
      elapsedMs: null,
      steps: [],
      outcome: null,
      outcomeMessage: null,
      slowStep: null,
    });
    stepStartTimeRef.current = null;
  }, []);

  return {
    state,
    startAttempt,
    transitionStep,
    completeAttempt,
    reset,
  };
}
