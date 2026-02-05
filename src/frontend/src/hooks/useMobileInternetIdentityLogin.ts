import { useEffect, useState, useCallback, useRef } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@icp-sdk/core/agent';

export interface MobileLoginResult {
  success: boolean;
  identity?: Identity;
  error?: string;
  blocked?: boolean;
  cancelled?: boolean;
}

/**
 * Mobile-safe Internet Identity login hook for Chrome Android
 * Pre-initializes AuthClient and provides a login method that preserves user gesture
 * Enhanced with clearer outcome reporting for diagnosability
 */
export function useMobileInternetIdentityLogin() {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const initAttemptedRef = useRef(false);

  // Pre-initialize AuthClient outside the click path
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    AuthClient.create()
      .then((client) => {
        setAuthClient(client);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize AuthClient:', err);
        setInitError('Failed to initialize authentication client');
      });
  }, []);

  /**
   * Mobile-safe login that preserves user gesture
   * Must be called directly from a click handler
   * Returns structured outcome for better error handling
   */
  const login = useCallback(async (): Promise<MobileLoginResult> => {
    if (!authClient || !isReady) {
      return {
        success: false,
        error: 'Authentication client not ready. Please wait a moment and try again.',
      };
    }

    try {
      const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';
      
      let loginCompleted = false;
      let loginError: string | undefined;

      // Call login synchronously to preserve user gesture
      await authClient.login({
        identityProvider: iiUrl,
        onSuccess: () => {
          loginCompleted = true;
        },
        onError: (error) => {
          console.error('II login error:', error);
          loginError = error || 'Login failed';
        },
      });

      // Check if we got an identity
      const identity = authClient.getIdentity();
      const isAuthenticated = await authClient.isAuthenticated();

      if (isAuthenticated && identity) {
        return { success: true, identity };
      } else if (loginError) {
        // Detect specific error types
        const errorLower = loginError.toLowerCase();
        if (errorLower.includes('popup') || errorLower.includes('blocked')) {
          return {
            success: false,
            error: 'Popup was blocked. Please allow popups and try again.',
            blocked: true,
          };
        }
        if (errorLower.includes('cancel') || errorLower.includes('interrupt')) {
          return {
            success: false,
            error: 'Login was cancelled.',
            cancelled: true,
          };
        }
        return {
          success: false,
          error: loginError,
        };
      } else {
        return {
          success: false,
          error: 'Login did not complete. Please try again.',
        };
      }
    } catch (err) {
      console.error('Mobile login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Detect popup blocking
      if (errorMessage.toLowerCase().includes('popup') || errorMessage.toLowerCase().includes('blocked')) {
        return {
          success: false,
          error: 'Popup was blocked. Please allow popups and try again.',
          blocked: true,
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [authClient, isReady]);

  return {
    login,
    isReady,
    initError,
  };
}
