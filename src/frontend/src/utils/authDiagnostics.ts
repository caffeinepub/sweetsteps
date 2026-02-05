/**
 * Centralized auth diagnostics utility for correlated logging and step tracking
 */

export type AuthStep =
  | 'idle'
  | 'click'
  | 'ii-initiation'
  | 'ii-popup-open'
  | 'ii-callback'
  | 'identity-validation'
  | 'actor-ready'
  | 'rbac-bootstrap'
  | 'onboarding-check'
  | 'navigation'
  | 'success'
  | 'error'
  | 'stalled';

export interface AuthStepTiming {
  step: AuthStep;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface CorrelatedAuthLog {
  correlationId: string;
  startTime: number;
  steps: AuthStepTiming[];
  currentStep: AuthStep;
  outcome?: 'success' | 'error' | 'stalled';
  errorMessage?: string;
}

/**
 * Generate a unique correlation ID for each auth attempt
 */
export function generateCorrelationId(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get human-readable step label for banner display
 */
export function getStepLabel(step: AuthStep): string {
  const labels: Record<AuthStep, string> = {
    idle: 'Ready',
    click: 'Starting...',
    'ii-initiation': 'Opening Internet Identity...',
    'ii-popup-open': 'Waiting for authentication...',
    'ii-callback': 'Processing authentication...',
    'identity-validation': 'Validating identity...',
    'actor-ready': 'Connecting to backend...',
    'rbac-bootstrap': 'Initializing permissions...',
    'onboarding-check': 'Checking account status...',
    navigation: 'Redirecting...',
    success: 'Success!',
    error: 'Error',
    stalled: 'Stalled',
  };
  return labels[step] || step;
}

/**
 * Create a grouped console log for a step
 */
export function logStep(
  correlationId: string,
  step: AuthStep,
  metadata?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const label = getStepLabel(step);
  
  console.groupCollapsed(
    `%c[${correlationId}] ${label}`,
    'color: #8B4513; font-weight: bold'
  );
  console.log('Step:', step);
  console.log('Time:', timestamp);
  if (metadata) {
    console.log('Metadata:', metadata);
  }
  console.groupEnd();
}

/**
 * Log a step transition with timing
 */
export function logStepTransition(
  correlationId: string,
  fromStep: AuthStep,
  toStep: AuthStep,
  duration?: number
): void {
  const timestamp = new Date().toISOString();
  
  console.groupCollapsed(
    `%c[${correlationId}] ${getStepLabel(fromStep)} → ${getStepLabel(toStep)}`,
    'color: #D2691E; font-weight: bold'
  );
  console.log('From:', fromStep);
  console.log('To:', toStep);
  console.log('Time:', timestamp);
  if (duration !== undefined) {
    console.log('Duration:', `${duration}ms`);
  }
  console.groupEnd();
}

/**
 * Log terminal outcome
 */
export function logTerminalOutcome(
  correlationId: string,
  outcome: 'success' | 'error' | 'stalled',
  totalDuration: number,
  message?: string
): void {
  const timestamp = new Date().toISOString();
  const color = outcome === 'success' ? '#228B22' : outcome === 'error' ? '#DC143C' : '#FF8C00';
  
  console.groupCollapsed(
    `%c[${correlationId}] Terminal: ${outcome.toUpperCase()}`,
    `color: ${color}; font-weight: bold; font-size: 1.1em`
  );
  console.log('Outcome:', outcome);
  console.log('Total Duration:', `${totalDuration}ms`);
  console.log('Time:', timestamp);
  if (message) {
    console.log('Message:', message);
  }
  console.groupEnd();
}

/**
 * Log slow step warning
 */
export function logSlowStep(
  correlationId: string,
  step: AuthStep,
  duration: number,
  threshold: number
): void {
  console.warn(
    `[${correlationId}] Slow step detected: ${getStepLabel(step)} took ${duration}ms (threshold: ${threshold}ms)`
  );
}
