/**
 * Shared Internet Identity configuration
 * Provides consistent II settings across desktop and mobile login flows
 */

import type { AuthClientCreateOptions, AuthClientLoginOptions } from '@dfinity/auth-client';
import { loadConfig } from '../config';

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);

/**
 * Get shared AuthClient creation options
 * Includes derivation origin configuration for live domains
 */
export async function getAuthClientCreateOptions(): Promise<AuthClientCreateOptions> {
  const config = await loadConfig();
  
  return {
    idleOptions: {
      disableDefaultIdleCallback: true,
      disableIdle: true,
    },
    ...(config.ii_derivation_origin && {
      loginOptions: {
        derivationOrigin: config.ii_derivation_origin,
      },
    }),
  };
}

/**
 * Get shared login options for Internet Identity
 * Includes identity provider URL and derivation origin
 */
export async function getLoginOptions(): Promise<AuthClientLoginOptions> {
  const config = await loadConfig();
  
  // Get II URL from window.process.env (set in index.html)
  const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';
  
  return {
    identityProvider: iiUrl,
    maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30), // 30 days
    ...(config.ii_derivation_origin && {
      derivationOrigin: config.ii_derivation_origin,
    }),
  };
}
