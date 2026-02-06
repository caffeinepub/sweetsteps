import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from './useInternetIdentity';
import { useActor } from './useActor';
import { useGetCallerUserProfile } from './useQueries';
import { isIdentityValid } from '../utils/identityValidation';

/**
 * Hook that automatically redirects authenticated users away from /login and /signup
 * based on their backend profile status (onboarding completion).
 * 
 * - If profile exists: redirect to /weekly-mountain
 * - If no profile: redirect to /onboarding
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
      navigate({ to: '/weekly-mountain' });
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
