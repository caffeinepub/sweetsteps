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
import { useAuthPageAutoredirect } from '../hooks/useAuthPageAutoredirect';
import { isIdentityValid, isSessionStale } from '../utils/identityValidation';
import { getPlatformInfo, isChromeAndroid } from '../utils/platform';
import { setNewAccountFlag } from '../utils/sessionFlags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuthPopupHelpPanel } from '../components/auth/AuthPopupHelpPanel';
import { AuthErrorPanel } from '../components/auth/AuthErrorPanel';
import { AuthDiagnosticsPanel } from '../components/auth/AuthDiagnosticsPanel';
import { AuthStatusBanner } from '../components/auth/AuthStatusBanner';
import { CanisterWarmupBanner } from '../components/auth/CanisterWarmupBanner';
import { getUrlParameter } from '../utils/urlParams';

type AttemptPhase = 'idle' | 'connecting' | 'validating' | 'checking-profile' | 'waiting-for-display-name' | 'redirecting' | 'error';

export default function Signup() {
  const { login: iiLogin, clear: iiClear, loginError: iiLoginError, identity: iiIdentity, loginStatus: iiLoginStatus, isInitializing: iiInitializing, isLoggingIn: iiIsLoggingIn } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isSettled: profileSettled } = useGetCallerUserProfile();
  const navigate = useNavigate();
  
  const [attemptPhase, setAttemptPhase] = useState<AttemptPhase>('idle');
  const [validatedIdentity, setValidatedIdentity] = useState<boolean>(false);
  const [mobileLoginError, setMobileLoginError] = useState<string | null>(null);
  
  // Track if user has initiated auth in this visit
  const userInitiatedAuthRef = useRef(false);
  
  const { isAttempting, startAttempt, endAttempt, getAttemptTimestamp, getElapsedMs, forceReset, hasUserInitiatedAuth } = useAuthAttemptGuard();
  const stalledState = useStalledAuthDetection(getAttemptTimestamp(), iiLoginStatus, iiIdentity,
    attemptPhase === 'connecting' ? 'ii-popup-open' : 
    attemptPhase === 'validating' ? 'identity-validation' : undefined
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

  // Auto-redirect if already authenticated
  const { isRedirecting } = useAuthPageAutoredirect();

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

  // Check profile and set flag - ONLY if user initiated auth
  useEffect(() => {
    const checkProfileAndSetFlag = async () => {
      // CRITICAL: Only proceed if user initiated auth in this visit
      if (!userInitiatedAuthRef.current) {
        return;
      }

      if (!validatedIdentity || !iiIdentity || !actor || actorFetching) return;
      
      // Don't run if we're already checking or waiting
      if (attemptPhase === 'checking-profile' || attemptPhase === 'waiting-for-display-name') return;

      setAttemptPhase('checking-profile');
      diagnostics.transitionStep('onboarding-check');
      
      try {
        // CRITICAL FIX: Wait for profile query to be fully settled
        if (profileLoading || !profileSettled) {
          return;
        }

        actorReadyTimeout.reset();
        
        // If profile is null, this is a new account - set the session flag and wait for display name
        if (userProfile === null) {
          console.log('[Signup] New account detected, setting flag and waiting for display name modal');
          setNewAccountFlag();
          setAttemptPhase('waiting-for-display-name');
          // Note: Not calling diagnostics.transitionStep here as 'waiting-for-display-name' is not a valid AuthStep
          // The PostAuthDisplayNameGate will now show the modal
          // After the modal is closed (save/skip), it will clear the flag and navigate to onboarding
        } else {
          // Existing profile - go to weekly-mountain
          setAttemptPhase('redirecting');
          diagnostics.transitionStep('navigation', { destination: '/weekly-mountain', newAccount: false });
          navigate({ to: '/weekly-mountain' });
          diagnostics.completeAttempt('success', 'Signup flow completed');
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        setAttemptPhase('error');
        setMobileLoginError('Failed to check account status. Please try again.');
        endAttempt();
        diagnostics.completeAttempt('error', 'Profile check failed');
      }
    };

    checkProfileAndSetFlag();
  }, [validatedIdentity, iiIdentity, actor, actorFetching, navigate, attemptPhase, diagnostics, actorReadyTimeout, userProfile, profileLoading, profileSettled, endAttempt]);

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
      diagnostics.completeAttempt('error', iiLoginError?.message || 'Signup error');
    }
  }, [iiLoginStatus, attemptPhase, endAttempt, diagnostics, iiLoginError, iiIdentity]);

  const handleSignup = useCallback(async () => {
    if (isAttempting) {
      console.warn('Auth attempt already in progress');
      return;
    }

    // Mark that user has initiated auth in this visit
    userInitiatedAuthRef.current = true;

    // Clear any previous errors
    setMobileLoginError(null);
    
    // Start the attempt guard
    startAttempt();
    diagnostics.startAttempt();
    
    // Set phase to connecting
    setAttemptPhase('connecting');
    diagnostics.transitionStep('ii-initiation');
    
    // Mark that we're waiting for II popup result
    waitingForIIRef.current = true;
    popupOpenDetectedRef.current = false;

    try {
      if (isChromeAndroid()) {
        // Use mobile-safe login for Chrome Android
        const result = await mobileLogin.login();
        
        if (result.blocked) {
          waitingForIIRef.current = false;
          popupOpenDetectedRef.current = false;
          setAttemptPhase('error');
          setMobileLoginError(
            'The Internet Identity window did not open. This may be due to popup blocking or browser restrictions. Please try again or use the direct link below.'
          );
          endAttempt();
          diagnostics.completeAttempt('error', 'Mobile popup blocked');
        } else if (result.cancelled) {
          waitingForIIRef.current = false;
          popupOpenDetectedRef.current = false;
          setAttemptPhase('idle');
          setMobileLoginError(null);
          endAttempt();
          diagnostics.completeAttempt('error', 'User cancelled mobile login');
        }
        // If success, the identity will be set and other effects will handle it
      } else {
        // Use standard desktop login
        await iiLogin();
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      waitingForIIRef.current = false;
      popupOpenDetectedRef.current = false;
      setAttemptPhase('error');
      setMobileLoginError(err.message || 'An unexpected error occurred. Please try again.');
      endAttempt();
      diagnostics.completeAttempt('error', err.message || 'Signup exception');
    }
  }, [isAttempting, startAttempt, endAttempt, iiLogin, mobileLogin, diagnostics]);

  const handleRetry = useCallback(() => {
    // Reset all state
    forceReset();
    setAttemptPhase('idle');
    setValidatedIdentity(false);
    setMobileLoginError(null);
    waitingForIIRef.current = false;
    popupOpenDetectedRef.current = false;
    diagnostics.reset();
  }, [forceReset, diagnostics]);

  const handleReturnToLanding = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  // Show loading while auto-redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        {/* Canister Warmup Banner */}
        {warmup.state !== 'ready' && (
          <CanisterWarmupBanner
            state={warmup.state}
            onRetry={warmup.retry}
          />
        )}

        {/* Auth Status Banner (only in debug mode or when there's an active attempt) */}
        {(debugAuth || diagnostics.state.currentStep !== 'idle') && (
          <AuthStatusBanner
            flowState={diagnostics.state}
            onRetry={handleRetry}
          />
        )}

        {/* Main Card */}
        <Card className="bg-card border-border">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              Welcome or Welcome back to SweetSteps
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Continue your SweetSteps journey — or begin one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attemptPhase === 'error' && mobileLoginError && (
              <AuthErrorPanel
                message={mobileLoginError}
                onRetry={handleRetry}
                onReturnToLanding={handleReturnToLanding}
              />
            )}

            {attemptPhase === 'error' && stalledState.isStalled && (
              <AuthPopupHelpPanel onRetry={handleRetry} />
            )}

            <Button
              onClick={handleSignup}
              disabled={
                isAttempting ||
                iiIsLoggingIn ||
                attemptPhase === 'validating' ||
                attemptPhase === 'checking-profile' ||
                attemptPhase === 'waiting-for-display-name' ||
                attemptPhase === 'redirecting' ||
                warmup.state === 'warming' ||
                warmup.state === 'idle'
              }
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isAttempting || iiIsLoggingIn || attemptPhase === 'validating' || attemptPhase === 'checking-profile' || attemptPhase === 'waiting-for-display-name' || attemptPhase === 'redirecting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {attemptPhase === 'connecting' && 'Opening Internet Identity...'}
                  {attemptPhase === 'validating' && 'Validating...'}
                  {attemptPhase === 'checking-profile' && 'Checking account...'}
                  {attemptPhase === 'waiting-for-display-name' && 'Setting up...'}
                  {attemptPhase === 'redirecting' && 'Redirecting...'}
                </>
              ) : (
                'Continue with Internet Identity'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>

        {/* Debug Diagnostics Panel */}
        {debugAuth && (
          <AuthDiagnosticsPanel
            loginStatus={iiLoginStatus}
            isLoggingIn={iiIsLoggingIn}
            isInitializing={iiInitializing}
            identity={iiIdentity}
            attemptPhase={attemptPhase}
            attemptElapsedMs={getElapsedMs()}
            platformInfo={platformInfo}
            stalledState={stalledState}
          />
        )}
      </div>
    </div>
  );
}
