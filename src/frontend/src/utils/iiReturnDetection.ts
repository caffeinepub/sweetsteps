/**
 * Utility to detect evidence of an in-progress Internet Identity return
 * Used to determine if we should wait longer for identity restoration
 */

import { getSessionParameter } from './urlParams';

const USER_INITIATED_AUTH_KEY = 'sweetsteps_user_initiated_auth';

/**
 * Checks if there is evidence that the user is returning from an II authentication flow
 * This is read-only detection that does not clear secrets or alter the URL
 * 
 * @returns true if there is evidence of an II return in progress
 */
export function hasIIReturnEvidence(): boolean {
  // Check 1: Is there an authorize callback marker in the hash?
  const hash = window.location.hash;
  if (hash && hash.includes('authorize=')) {
    console.log('[II Return Detection] Found authorize= in hash');
    return true;
  }

  // Check 2: Did the user initiate auth in this session?
  const userInitiatedAuth = getSessionParameter(USER_INITIATED_AUTH_KEY);
  if (userInitiatedAuth === 'true') {
    console.log('[II Return Detection] User initiated auth flag is set');
    return true;
  }

  return false;
}

/**
 * Gets a descriptive reason for why II return evidence was detected
 * Useful for diagnostic logging
 */
export function getIIReturnEvidenceReason(): string | null {
  const hash = window.location.hash;
  if (hash && hash.includes('authorize=')) {
    return 'authorize callback in URL hash';
  }

  const userInitiatedAuth = getSessionParameter(USER_INITIATED_AUTH_KEY);
  if (userInitiatedAuth === 'true') {
    return 'user-initiated auth session flag';
  }

  return null;
}
