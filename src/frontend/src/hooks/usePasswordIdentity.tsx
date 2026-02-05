import {
  type ReactNode,
  type PropsWithChildren,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Identity } from '@icp-sdk/core/agent';
import { createIdentityFromCredentials, storeIdentity, restoreIdentity, clearStoredIdentity } from '../utils/passwordIdentity';

export type PasswordIdentityContext = {
  /** The password-based identity, available after login or restoration from storage. */
  identity?: Identity;

  /** Set the identity after successful username/password authentication. */
  setIdentity: (username: string, password: string) => void;

  /** Clear the identity (logout). */
  clearIdentity: () => void;

  /** Whether the identity is being restored from storage. */
  isInitializing: boolean;
};

type ProviderValue = PasswordIdentityContext;
const PasswordIdentityReactContext = createContext<ProviderValue | undefined>(undefined);

/**
 * Helper function to assert provider is present.
 */
function assertProviderPresent(context: ProviderValue | undefined): asserts context is ProviderValue {
  if (!context) {
    throw new Error('PasswordIdentityProvider is not present. Wrap your component tree with it.');
  }
}

/**
 * Hook to access the password-based identity.
 */
export const usePasswordIdentity = (): PasswordIdentityContext => {
  const context = useContext(PasswordIdentityReactContext);
  assertProviderPresent(context);
  return context;
};

/**
 * Provider that manages username/password-based identity lifecycle.
 * Restores identity from localStorage on mount and persists on changes.
 */
export function PasswordIdentityProvider({ children }: PropsWithChildren<{ children: ReactNode }>) {
  const [identity, setIdentityState] = useState<Identity | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore identity from localStorage on mount
  useEffect(() => {
    const restored = restoreIdentity();
    if (restored) {
      setIdentityState(restored);
    }
    setIsInitializing(false);
  }, []);

  const setIdentity = useCallback((username: string, password: string) => {
    const newIdentity = createIdentityFromCredentials(username, password);
    storeIdentity(newIdentity);
    setIdentityState(newIdentity);
  }, []);

  const clearIdentity = useCallback(() => {
    clearStoredIdentity();
    setIdentityState(undefined);
  }, []);

  const value = useMemo<ProviderValue>(
    () => ({
      identity,
      setIdentity,
      clearIdentity,
      isInitializing,
    }),
    [identity, setIdentity, clearIdentity, isInitializing]
  );

  return createElement(PasswordIdentityReactContext.Provider, { value, children });
}
