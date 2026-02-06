/**
 * Internet Identity Authorize Callback Handler
 * Detects and handles the #authorize=<principal> callback from II OAuth flow
 * Routes to /weekly-mountain if onboarding complete AND user has seen Sweet Summit
 * Routes to /onboarding if onboarding not complete
 * Does NOT auto-redirect on first login after onboarding (lets user see Sweet Summit)
 * CRITICAL: Only runs if user initiated auth in current visit (via sessionStorage flag)
 * 
 * NOTE: This handler is now non-blocking and does not interfere with Signup/Login pages
 * which have their own post-auth logic. It only handles the case where the user returns
 * from II and the Signup/Login page is not mounted (e.g., direct navigation).
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetCallerUserProfile } from '../../hooks/useQueries';
import { getSecretFromHash } from '../../utils/urlParams';

const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';
const USER_INITIATED_AUTH_KEY = 'sweetsteps_user_initiated_auth';

export function InternetIdentityAuthorizeCallbackHandler() {
  const navigate = useNavigate();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasHandledRef.current) return;

    // Check for authorize principal in hash (getSecretFromHash automatically clears it)
    const principal = getSecretFromHash('authorize');
    
    if (principal) {
      console.log('II authorize callback detected');
      
      // CRITICAL: Only proceed if user initiated auth in this visit
      const userInitiatedAuth = sessionStorage.getItem(USER_INITIATED_AUTH_KEY);
      if (userInitiatedAuth !== 'true') {
        console.log('Callback detected but user did not initiate auth in this visit - ignoring');
        return;
      }
      
      console.log('User initiated auth confirmed, checking onboarding status');
      hasHandledRef.current = true;
      
      // Wait for profile to be fetched
      if (profileLoading || !profileFetched) {
        return;
      }

      // Check if user has completed onboarding (has a profile in backend)
      if (userProfile !== null) {
        // User has completed onboarding
        // Check if this is first login (Sweet Summit not yet seen)
        const hasSeenSweetSummit = localStorage.getItem(SWEET_SUMMIT_SEEN_KEY);
        
        if (hasSeenSweetSummit === 'false') {
          // First login after onboarding - do NOT auto-redirect
          // Let the onboarding flow show Sweet Summit naturally
          console.log('First login after onboarding detected, not auto-redirecting (will show Sweet Summit)');
          return;
        }
        
        // Subsequent login - auto-redirect to weekly mountain
        console.log('Onboarding complete and Sweet Summit seen, navigating to /weekly-mountain');
        navigate({ to: '/weekly-mountain' });
      } else {
        // User has not completed onboarding
        console.log('Onboarding incomplete, navigating to /onboarding');
        navigate({ to: '/onboarding' });
      }
    }
  }, [navigate, userProfile, profileLoading, profileFetched]);

  // This component doesn't render anything
  return null;
}
