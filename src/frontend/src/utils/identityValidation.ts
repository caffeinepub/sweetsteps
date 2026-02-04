import type { Identity } from '@icp-sdk/core/agent';
import { DelegationIdentity, isDelegationValid } from '@icp-sdk/core/identity';

/**
 * Validates whether an identity is usable for authenticated operations.
 * Checks if the identity is non-anonymous and has a valid delegation.
 */
export function isIdentityValid(identity: Identity | undefined): boolean {
  if (!identity) return false;
  
  // Anonymous principals are not valid authenticated identities
  if (identity.getPrincipal().isAnonymous()) return false;
  
  // If it's a delegation identity, check if the delegation is still valid
  if (identity instanceof DelegationIdentity) {
    return isDelegationValid(identity.getDelegation());
  }
  
  // Other identity types are considered valid if non-anonymous
  return true;
}

/**
 * Determines if the current session should be considered stale/invalid
 * and requires a fresh login attempt.
 */
export function isSessionStale(identity: Identity | undefined): boolean {
  if (!identity) return false;
  
  // If we have an identity but it's not valid, it's stale
  return !isIdentityValid(identity);
}
