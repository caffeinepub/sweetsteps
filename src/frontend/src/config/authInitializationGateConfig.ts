/**
 * Configuration for the auth initialization gate.
 * Controls timeout thresholds and error messages for the auth initialization phase.
 */

export const AUTH_GATE_CONFIG = {
  // Timeout in milliseconds before showing error state (15 seconds)
  // This timeout applies to the entire gate blocking period, regardless of which condition is blocking
  TIMEOUT_MS: 15000,
  
  // Messages (all in English)
  LOADING_MESSAGE: 'Validating identity',
  TIMEOUT_ERROR_MESSAGE: 'Authentication is taking longer than expected. This might be due to a network issue or an expired session. Please try reloading the page.',
  STALE_SESSION_ERROR_MESSAGE: 'Your session has expired or is invalid. Please log in again to continue.',
} as const;
