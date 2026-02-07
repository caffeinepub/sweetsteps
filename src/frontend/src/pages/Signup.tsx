import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { useAuthAttemptGuard } from '../hooks/useAuthAttemptGuard';
import { useStalledAuthDetection } from '../hooks/useStalledAuthDetection';
import { useMobileInternetIdentityLoginPatched } from '../hooks/useMobileInternetIdentityLoginPatched';
import { useAuthFlowDiagnostics } from '../hooks/useAuthFlowDiagnostics';
import { useCanisterWarmup } from '../hooks/useCanisterWarmup';
import { usePostAuthTimeout } from '../hooks/usePostAuthTimeout';
import { isIdentityValid, isSessionStale } from '../utils/identityValidation';
import { getPlatformInfo, isChromeAndroid } from '../utils/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuthPopupHelpPanel } from '../components/auth/AuthPopupHelpPanel';
import { AuthErrorPanel } from '../components/auth/AuthErrorPanel';
import { AuthDiagnosticsPanel } from '../components/auth/AuthDiagnosticsPanel';
import { AuthStatusBanner } from '../components/auth/AuthStatusBanner';
import { CanisterWarmupBanner } from '../components/auth/CanisterWarmupBanner';
import { getUrlParameter } from '../utils/urlParams';
import { setNewAccountFlag } from '../utils/sessionFlags';

type AttemptPhase = 'idle' | 'connecting' | 'validating' | 'checking-profile' | 'waiting-for-display-name' | 'error';

export default function Signup() {
  const { login: iiLogin, clear: iiClear, loginError: iiLoginError, identity: iiIdentity, loginStatus: iiLoginStatus, isInitializing: iiInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const navigate = useNavigate();
  
  const [attemptPhase, setAttemptPhase] = useState<AttemptPhase>('idle');
  const [validatedIdentity, setValidatedIdentity] = useState<boolean>(false);
  const [profileCheckError, setProfileCheckError] = useState<string | null>(null);
  const [mobileLoginError, setMobileLoginError] = useState<string | null>(null);
  
  // Track if user has initiated auth in this visit
  const userInitiatedAuthRef = useRef(false);
  
  const { isAttempting, startAttempt, endAttempt, getAttemptTimestamp, getElapsedMs, forceReset } = useAuthAttemptGuard();
  const stalledState = useStalledAuthDetection(getAttemptTimestamp(), iiLoginStatus, iiIdentity, 
    attemptPhase === 'connecting' ? 'ii-popup-open' : 
    attemptPhase === 'validating' ? 'identity-validation' :
    attemptPhase === 'checking-profile' ? 'onboarding-check' : undefined
  );
  
  // Auth flow diagnostics
  const diagnostics = useAuthFlowDiagnostics();
  
  // Canister warmup hook - auto-start on mount
  const warmup = useCanisterWarmup(true);
  
  // Track if we're waiting for II popup result
  const waitingForIIRef = useRef(false);
  
  // Track popup open detection
  const popupOpenDetectedRef = useRef(false);
  
  // Mobile-safe login hook for Chrome Android (patched version)
  const mobileLogin = useMobileInternetIdentityLoginPatched();
  
  // Check for debug mode
  const debugAuth = getUrlParameter('debugAuth') === '1';
  const platformInfo = getPlatformInfo();

  // Post-auth timeout for validation phase
  const validationTimeout = usePostAuthTimeout({
    phase: attemptPhase === 'validating' ? 'validation' : null,
    onTimeout: () => {
      console.warn('Identity validation timed out');
      setAttemptPhase('error');
      setMobileLoginError('Identity validation took too long. Please try again.');
      endAttempt();
      diagnostics.completeAttempt('error', 'Validation timeout');
    },
  });

  // Post-auth timeout for actor-ready phase
  const actorReadyTimeout = usePostAuthTimeout({
    phase: attemptPhase === 'validating' && validatedIdentity && !actor ? 'actor-ready' : null,
    onTimeout: () => {
      console.warn('Actor initialization timed out');
      setAttemptPhase('error');
      setMobileLoginError('Connection to backend took too long. Please try again.');
      endAttempt();
      diagnostics.completeAttempt('error', 'Actor ready timeout');
    },
  });

  // Post-auth timeout for profile check phase
  const profileCheckTimeout = usePostAuthTimeout({
    phase: attemptPhase === 'checking-profile' ? 'onboarding-check' : null,
    onTimeout: () => {
      console.warn('Profile check timed out');
      setAttemptPhase('error');
      setProfileCheckError('Profile check took too long. Please try again.');
      endAttempt();
      diagnostics.completeAttempt('error', 'Profile check timeout');
    },
  });

  // Clear stale sessions on mount (outside user-gesture path)
  useEffect(() => {
    if (iiIdentity && isSessionStale(iiIdentity) && attemptPhase === 'idle') {
      iiClear();
    }
  }, [iiIdentity, iiClear, attemptPhase]);

  // Detect when II popup is closed/canceled via window focus
  useEffect(() => {
    if (!waitingForIIRef.current || attemptPhase !== 'connecting') {
      return;
    }

    let checkTimeoutId: NodeJS.Timeout;

    const handleWindowFocus = () => {
      // When window regains focus, check if authentication completed
      // Use a small delay to allow II callback to fire first
      checkTimeoutId = setTimeout(() => {
        if (waitingForIIRef.current && attemptPhase === 'connecting' && iiLoginStatus === 'logging-in' && !iiIdentity) {
          // User returned to window but no identity was set
          // This indicates the II popup was closed/canceled
          console.log('II popup closed without authentication - resetting state');
          waitingForIIRef.current = false;
          popupOpenDetectedRef.current = false;
          endAttempt();
          setAttemptPhase('idle');
          setMobileLoginError(null);
          diagnostics.completeAttempt('error', 'Popup closed without completing authentication');
        }
      }, 500);
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (checkTimeoutId) {
        clearTimeout(checkTimeoutId);
      }
    };
  }, [waitingForIIRef.current, attemptPhase, iiLoginStatus, iiIdentity, endAttempt, diagnostics]);

  // Popup open detection for desktop
  useEffect(() => {
    if (!waitingForIIRef.current || attemptPhase !== 'connecting' || isChromeAndroid()) {
      return;
    }

    let popupCheckTimeoutId: NodeJS.Timeout;
    let blurDetected = false;

    const handleBlur = () => {
      // Window lost focus - likely popup opened
      blurDetected = true;
      popupOpenDetectedRef.current = true;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - likely popup opened
        blurDetected = true;
        popupOpenDetectedRef.current = true;
      }
    };

    // Listen for blur/visibility change as signals popup opened
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fail-fast timer: if no blur/visibility change and no auth progress after 1s, assume blocked
    popupCheckTimeoutId = setTimeout(() => {
      if (!blurDetected && !popupOpenDetectedRef.current && !iiIdentity && iiLoginStatus === 'logging-in') {
        console.warn('Popup open not detected - likely blocked');
        waitingForIIRef.current = false;
        popupOpenDetectedRef.current = false;
        endAttempt();
        setAttemptPhase('error');
        setMobileLoginError(
          'The Internet Identity window did not open. This may be due to popup blocking or browser restrictions. Please try again or use the direct link below.'
        );
        diagnostics.completeAttempt('error', 'Popup blocked - no window open signal detected');
      }
    }, 1000);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (popupCheckTimeoutId) {
        clearTimeout(popupCheckTimeoutId);
      }
    };
  }, [waitingForIIRef.current, attemptPhase, iiLoginStatus, iiIdentity, endAttempt, diagnostics]);

  // Handle stalled auth detection - automatically recover
  useEffect(() => {
    if (stalledState.isStalled && attemptPhase === 'connecting') {
      console.warn('Auth attempt stalled - recovering to error state');
      
      // End the attempt guard
      waitingForIIRef.current = false;
      popupOpenDetectedRef.current = false;
      endAttempt();
      
      // Transition to error phase
      setAttemptPhase('error');
      
      // Set a helpful error message
      setMobileLoginError(
        'The Internet Identity window did not open. This may be due to popup blocking or browser restrictions. Please try again or use the direct link below.'
      );
      
      diagnostics.completeAttempt('stalled', stalledState.stalledReason || 'Authentication stalled');
    }
  }, [stalledState.isStalled, attemptPhase, endAttempt, diagnostics, stalledState.stalledReason]);

  // Validate identity when it changes - ONLY if user initiated auth
  useEffect(() => {
    if (!iiIdentity) {
      setValidatedIdentity(false);
      return;
    }

    // CRITICAL: Only validate if user initiated auth in this visit
    if (!userInitiatedAuthRef.current) {
      return;
    }

    // Only validate if we're not in the middle of an attempt
    if (attemptPhase === 'idle' || attemptPhase === 'validating') {
      const valid = isIdentityValid(iiIdentity);
      setValidatedIdentity(valid);
      
      if (valid && attemptPhase === 'validating') {
        diagnostics.transitionStep('identity-validation', { valid: true });
        validationTimeout.reset();
      }
    }
  }, [iiIdentity, attemptPhase, diagnostics, validationTimeout]);

  // Check profile status after validation - ONLY if user initiated auth
  useEffect(() => {
    const checkProfile = async () => {
      // CRITICAL: Only proceed if user initiated auth in this visit
      if (!userInitiatedAuthRef.current) {
        return;
      }

      // Only proceed if we have a validated identity and actor is ready
      if (!validatedIdentity || !iiIdentity || !actor || actorFetching) return;
      
      // Don't run if we're already checking or waiting
      if (attemptPhase === 'checking-profile' || attemptPhase === 'waiting-for-display-name') return;

      setAttemptPhase('checking-profile');
      setProfileCheckError(null);
      diagnostics.transitionStep('onboarding-check');
      
      try {
        // Wait for profile to be fetched
        if (profileLoading || !profileFetched) {
          return;
        }

        profileCheckTimeout.reset();
        
        // If profile is null, this is a new account
        if (userProfile === null) {
          console.log('[Signup] New account detected, setting new-account flag');
          setNewAccountFlag();
          setAttemptPhase('waiting-for-display-name');
          diagnostics.completeAttempt('success', 'New account - waiting for display name');
          // PostAuthDisplayNameGate will handle the display name prompt and navigation
        } else {
          // Profile exists - user already has an account
          console.log('[Signup] Existing account detected, navigating to /weekly-mountain');
          diagnostics.transitionStep('navigation', { destination: '/weekly-mountain' });
          navigate({ to: '/weekly-mountain' });
          diagnostics.completeAttempt('success', 'Existing account - redirected to weekly mountain');
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setProfileCheckError(
          `Failed to check your profile: ${errorMessage}. Please try again or return to the landing page.`
        );
        setAttemptPhase('error');
        endAttempt();
        diagnostics.completeAttempt('error', `Profile check failed: ${errorMessage}`);
      }
    };

    checkProfile();
  }, [validatedIdentity, iiIdentity, actor, actorFetching, navigate, attemptPhase, endAttempt, diagnostics, profileCheckTimeout, userProfile, profileLoading, profileFetched]);

  // Track login status changes (II only) - ONLY if user initiated auth
  useEffect(() => {
    // CRITICAL: Only process login status if user initiated auth in this visit
    if (!userInitiatedAuthRef.current) {
      return;
    }

    if (iiLoginStatus === 'logging-in' && attemptPhase === 'connecting') {
      // Login initiated successfully
      diagnostics.transitionStep('ii-popup-open');
      return;
    }
    
    if (iiLoginStatus === 'success' && attemptPhase === 'connecting') {
      // Login succeeded, move to validation phase
      waitingForIIRef.current = false;
      popupOpenDetectedRef.current = false;
      setAttemptPhase('validating');
      diagnostics.transitionStep('ii-callback', { success: true });
      
      // Ensure the callback hash is in the correct format for the handler
      const currentHash = window.location.hash;
      if (iiIdentity && !currentHash.includes('authorize=')) {
        const principal = iiIdentity.getPrincipal().toString();
        window.location.hash = `authorize=${principal}`;
      }
    }
    
    if (iiLoginStatus === 'loginError') {
      waitingForIIRef.current = false;
      popupOpenDetectedRef.current = false;
      setAttemptPhase('error');
      endAttempt();
      diagnostics.completeAttempt('error', iiLoginError?.message || 'Login error');
    }
  }, [iiLoginStatus, attemptPhase, endAttempt, diagnostics, iiLoginError, iiIdentity]);

  // Track actor readiness - ONLY if user initiated auth
  useEffect(() => {
    // CRITICAL: Only track actor if user initiated auth in this visit
    if (!userInitiatedAuthRef.current) {
      return;
    }

    if (attemptPhase === 'validating' && validatedIdentity && actor && !actorFetching) {
      diagnostics.transitionStep('actor-ready');
      actorReadyTimeout.reset();
    }
  }, [attemptPhase, validatedIdentity, actor, actorFetching, diagnostics, actorReadyTimeout]);

  const handleIISignup = useCallback(async () => {
    if (isAttempting) {
      console.warn('Auth attempt already in progress');
      return;
    }

    // Mark that user has initiated auth in this visit
    userInitiatedAuthRef.current = true;

    // Reset error states
    setMobileLoginError(null);
    setProfileCheckError(null);
    
    // Clear any existing identity first to force account selection
    await iiClear();
    
    // Start attempt guard
    startAttempt();
    setAttemptPhase('connecting');
    diagnostics.startAttempt();
    diagnostics.transitionStep('ii-initiation');
    
    // Mark that we're waiting for II popup result
    waitingForIIRef.current = true;
    popupOpenDetectedRef.current = false;

    try {
      if (isChromeAndroid()) {
        // Use mobile-safe login for Chrome Android
        const outcome = await mobileLogin.login();
        
        if (outcome.success) {
          // Success handled by useEffect watching iiLoginStatus
          console.log('[Signup] Mobile signup succeeded');
        } else if (outcome.blocked) {
          waitingForIIRef.current = false;
          popupOpenDetectedRef.current = false;
          setAttemptPhase('error');
          setMobileLoginError(
            'The Internet Identity window did not open. This may be due to popup blocking or browser restrictions. Please try again or use the direct link below.'
          );
          endAttempt();
          diagnostics.completeAttempt('error', 'Mobile popup blocked');
        } else if (outcome.cancelled) {
          waitingForIIRef.current = false;
          popupOpenDetectedRef.current = false;
          setAttemptPhase('idle');
          endAttempt();
          diagnostics.completeAttempt('error', 'User cancelled authentication');
        }
      } else {
        // Use standard II login for desktop (will show account chooser/create new)
        await iiLogin();
        // Success/error handled by useEffect watching iiLoginStatus
      }
    } catch (error: any) {
      console.error('[Signup] Signup error:', error);
      waitingForIIRef.current = false;
      popupOpenDetectedRef.current = false;
      setAttemptPhase('error');
      setMobileLoginError(error.message || 'An unexpected error occurred during signup');
      endAttempt();
      diagnostics.completeAttempt('error', error.message || 'Signup exception');
    }
  }, [isAttempting, startAttempt, endAttempt, iiLogin, iiClear, mobileLogin, diagnostics]);

  const handleRetry = useCallback(() => {
    // Reset all state
    forceReset();
    setAttemptPhase('idle');
    setMobileLoginError(null);
    setProfileCheckError(null);
    setValidatedIdentity(false);
    waitingForIIRef.current = false;
    popupOpenDetectedRef.current = false;
    diagnostics.reset();
    
    // Retry signup
    setTimeout(() => handleIISignup(), 100);
  }, [forceReset, handleIISignup, diagnostics]);

  const handleReturnToLanding = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  // Show warmup banner if warming up or failed
  const showWarmupBanner = warmup.state === 'warming' || warmup.state === 'failed';

  // Show error panel if we have an error
  const showErrorPanel = attemptPhase === 'error' && (mobileLoginError || profileCheckError);

  // Show help panel if stalled on connecting
  const showHelpPanel = stalledState.isStalled && attemptPhase === 'connecting';

  // Determine if signup button should be disabled
  const isSignupDisabled = 
    isAttempting || 
    attemptPhase !== 'idle' || 
    warmup.state === 'warming' ||
    iiInitializing;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Warmup Banner */}
      {showWarmupBanner && (
        <div className="w-full">
          <CanisterWarmupBanner
            state={warmup.state}
            onRetry={warmup.retry}
          />
        </div>
      )}

      {/* Auth Status Banner (only in debug mode) */}
      {debugAuth && (
        <AuthStatusBanner
          flowState={diagnostics.state}
          onRetry={handleRetry}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-2 sm:py-4">
        <div className="w-full max-w-md space-y-6">
          {/* Error Panel */}
          {showErrorPanel && (
            <AuthErrorPanel
              message={mobileLoginError || profileCheckError || 'An error occurred'}
              onRetry={handleRetry}
              onReturnToLanding={handleReturnToLanding}
            />
          )}

          {/* Help Panel */}
          {showHelpPanel && (
            <AuthPopupHelpPanel
              onRetry={handleRetry}
            />
          )}

          {/* Signup Card */}
          {!showErrorPanel && !showHelpPanel && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
                <CardDescription className="text-center">
                  Sign up to start your SweetSteps journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  size="lg"
                  className="w-full text-base font-semibold h-12 rounded-xl"
                  onClick={handleIISignup}
                  disabled={isSignupDisabled}
                >
                  {isAttempting || attemptPhase !== 'idle' ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {attemptPhase === 'connecting' && 'Opening Internet Identity...'}
                      {attemptPhase === 'validating' && 'Validating...'}
                      {attemptPhase === 'checking-profile' && 'Checking profile...'}
                      {attemptPhase === 'waiting-for-display-name' && 'Setting up...'}
                    </>
                  ) : warmup.state === 'warming' ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : iiInitializing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    'Sign Up with Internet Identity'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    className="text-primary hover:underline font-medium"
                  >
                    Log in
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnostics Panel (only in debug mode) */}
          {debugAuth && (
            <AuthDiagnosticsPanel
              loginStatus={iiLoginStatus}
              isLoggingIn={iiLoginStatus === 'logging-in'}
              isInitializing={iiInitializing}
              identity={iiIdentity}
              attemptPhase={attemptPhase}
              attemptElapsedMs={getElapsedMs()}
              platformInfo={platformInfo}
              stalledState={stalledState}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-sm text-muted-foreground">
        © 2026. Built with 🤎 using{' '}
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
