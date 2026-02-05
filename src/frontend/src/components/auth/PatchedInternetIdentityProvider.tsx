/**
 * Patched Internet Identity Provider
 * Wraps the standard InternetIdentityProvider with live-origin-safe configuration
 */

import { type ReactNode } from 'react';
import { InternetIdentityProvider } from '../../hooks/useInternetIdentity';
import { getAuthClientCreateOptions } from '../../auth/iiConfig';
import { useEffect, useState } from 'react';
import type { AuthClientCreateOptions } from '@dfinity/auth-client';

interface PatchedInternetIdentityProviderProps {
  children: ReactNode;
}

export function PatchedInternetIdentityProvider({ children }: PatchedInternetIdentityProviderProps) {
  const [createOptions, setCreateOptions] = useState<AuthClientCreateOptions | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getAuthClientCreateOptions()
      .then((options) => {
        setCreateOptions(options);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to load II config:', err);
        setIsReady(true); // Continue with defaults
      });
  }, []);

  if (!isReady) {
    return null; // Wait for config to load
  }

  return (
    <InternetIdentityProvider createOptions={createOptions}>
      {children}
    </InternetIdentityProvider>
  );
}
