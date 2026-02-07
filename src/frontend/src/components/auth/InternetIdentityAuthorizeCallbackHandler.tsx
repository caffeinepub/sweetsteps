/**
 * Internet Identity Authorize Callback Handler
 * Detects and handles the #authorize=<principal> callback from II OAuth flow
 * Routes based on onboarding completion and Sweet Summit seen status
 * CRITICAL: Only runs if user initiated auth in current visit (via sessionStorage flag)
 * AND waits for auth to be fully settled before making routing decisions
 * 
 * NOTE: This handler is now non-blocking and does not interfere with Signup/Login pages
 * which have their own post-auth logic. It only handles the case where the user returns
 * from II and the Signup/Login page is not mounted (e.g., direct navigation).
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetCallerUserProfile } from '../../hooks/useQueries';
import { useAuthStabilization } from '../../hooks/useAuthStabilization';
import { getSecretFromHash } from '../../utils/urlParams';

const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';
const USER_INITIATED_AUTH_KEY = 'sweetsteps_user_initiated_auth';

export function InternetIdentityAuthorizeCallbackHandler() {
  const navigate = useNavigate();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const { isSettled, isAuthenticated, identity } = useAuthStabilization();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasHandledRef.current) return;

    // Check for authorize principal in hash (getSecretFromHash automatically clears it)
    const principal = getSecretFromHash('authorize');
    
    if (principal) {
      console.log('[II Callback Handler] II authorize callback detected');
      
      // CRITICAL: Only proceed if user initiated auth in this visit
      const userInitiatedAuth = sessionStorage.getItem(USER_INITIATED_AUTH_KEY);
      if (userInitiatedAuth !== 'true') {
        console.log('[II Callback Handler] Callback detected but user did not initiate auth in this visit - ignoring');
        return;
      }
      
      console.log('[II Callback Handler] User initiated auth confirmed');

      // CRITICAL: Wait for auth to be fully settled before making routing decisions
      if (!isSettled) {
        console.log('[II Callback Handler] Auth not yet settled - waiting');
        return;
      }

      console.log('[II Callback Handler] Auth is settled, checking authentication state');

      // Verify we have a valid authenticated identity
      if (!isAuthenticated || !identity || identity.getPrincipal().isAnonymous()) {
        console.warn('[II Callback Handler] Auth settled but no valid identity - cannot route');
        return;
      }

      console.log('[II Callback Handler] Valid authenticated identity confirmed, checking onboarding status');
      hasHandledRef.current = true;
      
      // Wait for profile to be fetched
      if (profileLoading || !profileFetched) {
        console.log('[II Callback Handler] Profile still loading - waiting');
        return;
      }

      // Check if user has completed onboarding (has a profile in backend)
      if (userProfile !== null) {
        // User has completed onboarding
        // Check Sweet Summit seen status
        const hasSeenSweetSummit = localStorage.getItem(SWEET_SUMMIT_SEEN_KEY);
        
        if (hasSeenSweetSummit === 'false') {
          // First login after onboarding - show Sweet Summit
          console.log('[II Callback Handler] First login after onboarding, navigating to /sweet-summit');
          navigate({ to: '/sweet-summit' });
        } else {
          // Subsequent login - go to weekly mountain
          console.log('[II Callback Handler] Onboarding complete and Sweet Summit seen, navigating to /weekly-mountain');
          navigate({ to: '/weekly-mountain' });
        }
      } else {
        // User has not completed onboarding
        console.log('[II Callback Handler] Onboarding incomplete, navigating to /onboarding');
        navigate({ to: '/onboarding' });
      }
    }
  }, [navigate, userProfile, profileLoading, profileFetched, isSettled, isAuthenticated, identity]);

  // This component doesn't render anything
  return null;
}
