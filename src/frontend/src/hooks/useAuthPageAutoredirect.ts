import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from './useInternetIdentity';
import { useActor } from './useActor';
import { useGetCallerUserProfile } from './useQueries';
import { isIdentityValid } from '../utils/identityValidation';

const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';

/**
 * Hook that automatically redirects authenticated users away from /login and /signup
 * based on their backend profile status (onboarding completion) and Sweet Summit seen status.
 * 
 * - If no profile: redirect to /onboarding
 * - If profile exists and Sweet Summit not seen: redirect to /sweet-summit
 * - If profile exists and Sweet Summit seen: redirect to /weekly-mountain
 */
export function useAuthPageAutoredirect() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Don't redirect if we've already done so
    if (hasRedirectedRef.current) return;

    // Wait for initialization to complete
    if (isInitializing) return;

    // Only redirect if we have a valid authenticated identity
    if (!identity || !isIdentityValid(identity)) return;

    // Wait for actor to be ready
    if (!actor || actorFetching) return;

    // Wait for profile query to complete
    if (profileLoading || !profileFetched) return;

    // Now we have all the data we need - redirect based on profile status
    hasRedirectedRef.current = true;

    if (userProfile !== null) {
      // Profile exists - user has completed onboarding
      // Check if they've seen Sweet Summit
      const hasSeenSweetSummit = localStorage.getItem(SWEET_SUMMIT_SEEN_KEY);
      
      if (hasSeenSweetSummit === 'false') {
        // First login after onboarding - show Sweet Summit
        navigate({ to: '/sweet-summit' });
      } else {
        // Subsequent login - go to weekly mountain
        navigate({ to: '/weekly-mountain' });
      }
    } else {
      // No profile - user needs to complete onboarding
      navigate({ to: '/onboarding' });
    }
  }, [
    identity,
    isInitializing,
    actor,
    actorFetching,
    userProfile,
    profileLoading,
    profileFetched,
    navigate,
  ]);

  return {
    isRedirecting: hasRedirectedRef.current,
  };
}
