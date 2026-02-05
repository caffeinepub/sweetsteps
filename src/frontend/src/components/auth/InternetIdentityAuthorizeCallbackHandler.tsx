/**
 * Internet Identity Authorize Callback Handler
 * Detects and handles the #authorize=<principal> callback from II OAuth flow
 * Routes to /weekly-mountain if onboarding complete, /onboarding if not
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useActor } from '../../hooks/useActor';
import { getSecretFromHash } from '../../utils/urlParams';

export function InternetIdentityAuthorizeCallbackHandler() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasHandledRef.current) return;

    // Check for authorize principal in hash (getSecretFromHash automatically clears it)
    const principal = getSecretFromHash('authorize');
    
    if (principal && actor) {
      console.log('II authorize callback detected, checking onboarding status');
      hasHandledRef.current = true;
      
      // Check onboarding status and route accordingly
      actor.canAccessOnboarding()
        .then((canAccess) => {
          if (canAccess) {
            // User has not completed onboarding
            navigate({ to: '/onboarding' });
          } else {
            // User has completed onboarding
            navigate({ to: '/weekly-mountain' });
          }
        })
        .catch((err) => {
          console.error('Error checking onboarding status in callback handler:', err);
          // Default to onboarding on error
          navigate({ to: '/onboarding' });
        });
    }
  }, [navigate, actor]);

  // This component doesn't render anything
  return null;
}
