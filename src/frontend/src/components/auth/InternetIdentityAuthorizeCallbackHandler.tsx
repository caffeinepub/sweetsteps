/**
 * Internet Identity Authorize Callback Handler
 * Detects and handles the #authorize=<principal> callback from II OAuth flow
 * Routes to /weekly-mountain if onboarding complete, /onboarding if not
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOnboardingResult } from '../../contexts/OnboardingResultContext';
import { getSecretFromHash } from '../../utils/urlParams';

export function InternetIdentityAuthorizeCallbackHandler() {
  const navigate = useNavigate();
  const { onboardingResult } = useOnboardingResult();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasHandledRef.current) return;

    // Check for authorize principal in hash (getSecretFromHash automatically clears it)
    const principal = getSecretFromHash('authorize');
    
    if (principal) {
      console.log('II authorize callback detected, checking onboarding status');
      hasHandledRef.current = true;
      
      // Check if user has completed onboarding based on localStorage
      if (onboardingResult) {
        // User has completed onboarding
        console.log('Onboarding complete, navigating to /weekly-mountain');
        navigate({ to: '/weekly-mountain' });
      } else {
        // User has not completed onboarding
        console.log('Onboarding incomplete, navigating to /onboarding');
        navigate({ to: '/onboarding' });
      }
    }
  }, [navigate, onboardingResult]);

  // This component doesn't render anything
  return null;
}
