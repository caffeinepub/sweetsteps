import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useAuthAttemptGuard } from '../hooks/useAuthAttemptGuard';
import { useStalledAuthDetection } from '../hooks/useStalledAuthDetection';
import { useMobileInternetIdentityLoginPatched } from '../hooks/useMobileInternetIdentityLoginPatched';
import { useAuthFlowDiagnostics } from '../hooks/useAuthFlowDiagnostics';
import { useCanisterWarmup } from '../hooks/useCanisterWarmup';
import { usePostAuthTimeout } from '../hooks/usePostAuthTimeout';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
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

type AttemptPhase = 'idle' | 'connecting' | 'validating' | 'checking-access' | 'redirecting' | 'error';

export default function Login() {
  const { login: iiLogin, clear: iiClear, loginError: iiLoginError, identity: iiIdentity, loginStatus: iiLoginStatus, isInitializing: iiInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { onboardingResult } = useOnboardingResult();
  const navigate = useNavigate();
  
  const [attemptPhase, setAttemptPhase] = useState<AttemptPhase>('idle');
  const [validatedIdentity, setValidatedIdentity] = useState<boolean>(false);
  const [onboardingCheckError, setOnboardingCheckError] = useState<string | null>(null);
  const [mobileLoginError, setMobileLoginError] = useState<string | null>(null);
  
  const { isAttempting, startAttempt, endAttempt, getAttemptTimestamp, getElapsedMs, forceReset } = useAuthAttemptGuard();
  const stalledState = useStalledAuthDetection(getAttemptTimestamp(), iiLoginStatus, iiIdentity, 
    attemptPhase === 'connecting' ? 'ii-popup-open' : 
    attemptPhase === 'validating' ? 'identity-validation' :
    attemptPhase === 'checking-access' ? 'onboarding-check' : undefined
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

  // Post-auth timeout for onboarding check phase
  const onboardingCheckTimeout = usePostAuthTimeout({
    phase: attemptPhase === 'checking-access' ? 'onboarding-check' : null,
    onTimeout: () => {
      console.warn('Onboarding check timed out');
      setAttemptPhase('error');
      setOnboardingCheckError('Account status check took too long. Please try again.');
      endAttempt();
      diagnostics.completeAttempt('error', 'Onboarding check timeout');
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

  // Validate identity when it changes
  useEffect(() => {
    if (!iiIdentity) {
      setValidatedIdentity(false);
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

  // Check onboarding status and redirect only after validation
  useEffect(() => {
    const checkAndRedirect = async () => {
      // Only proceed if we have a validated identity and actor is ready
      if (!validatedIdentity || !iiIdentity || !actor || actorFetching) return;
      
      // Don't run if we're already checking or redirecting
      if (attemptPhase === 'checking-access' || attemptPhase === 'redirecting') return;

      setAttemptPhase('checking-access');
      setOnboardingCheckError(null);
      diagnostics.transitionStep('onboarding-check');
      
      try {
        // Check onboarding status from localStorage
        const hasOnboardingResult = !!onboardingResult;
        onboardingCheckTimeout.reset();
        setAttemptPhase('redirecting');
        diagnostics.transitionStep('navigation', { destination: hasOnboardingResult ? '/weekly-mountain' : '/onboarding' });
        
        if (hasOnboardingResult) {
          // User has completed onboarding
          navigate({ to: '/weekly-mountain' });
        } else {
          // User has not completed onboarding
          navigate({ to: '/onboarding' });
        }
        
        diagnostics.completeAttempt('success', 'Login successful');
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setOnboardingCheckError(
          `Failed to check your account status: ${errorMessage}. Please try again or return to the landing page.`
        );
        setAttemptPhase('error');
        endAttempt();
        diagnostics.completeAttempt('error', `Onboarding check failed: ${errorMessage}`);
      }
    };

    checkAndRedirect();
  }, [validatedIdentity, iiIdentity, actor, actorFetching, navigate, attemptPhase, endAttempt, diagnostics, onboardingCheckTimeout, onboardingResult]);

  // Track login status changes (II only)
  useEffect(() => {
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

  // Track actor readiness
  useEffect(() => {
    if (attemptPhase === 'validating' && validatedIdentity && actor && !actorFetching) {
      diagnostics.transitionStep('actor-ready');
      actorReadyTimeout.reset();
    }
  }, [attemptPhase, validatedIdentity, actor, actorFetching, diagnostics, actorReadyTimeout]);

  const handleIILogin = useCallback(async () => {
    // Guard against re-entrancy
    if (!startAttempt()) {
      return;
    }
    
    // Start diagnostics
    diagnostics.startAttempt();
    
    // Clear any previous errors (synchronous)
    setOnboardingCheckError(null);
    setMobileLoginError(null);
    setValidatedIdentity(false);
    setAttemptPhase('connecting');
    waitingForIIRef.current = true;
    popupOpenDetectedRef.current = false;
    
    diagnostics.transitionStep('ii-initiation');
    
    // Branch based on platform
    if (isChromeAndroid()) {
      // Use mobile-safe login path for Chrome Android
      if (!mobileLogin.isReady) {
        setMobileLoginError('Authentication system is initializing. Please wait a moment and try again.');
        setAttemptPhase('error');
        waitingForIIRef.current = false;
        endAttempt();
        diagnostics.completeAttempt('error', 'Mobile auth client not ready');
        return;
      }

      try {
        const result = await mobileLogin.login();
        
        if (result.success && result.identity) {
          // Mobile login succeeded, transition to validating
          waitingForIIRef.current = false;
          setAttemptPhase('validating');
          diagnostics.transitionStep('ii-callback', { success: true, mobile: true });
          
          // Set the authorize hash for the callback handler
          const principal = result.identity.getPrincipal().toString();
          window.location.hash = `authorize=${principal}`;
        } else {
          // Mobile login failed
          const errorMsg = result.error || 'Login failed. Please try again.';
          setMobileLoginError(errorMsg);
          setAttemptPhase('error');
          waitingForIIRef.current = false;
          endAttempt();
          diagnostics.completeAttempt('error', errorMsg);
        }
      } catch (err) {
        console.error('Mobile login error:', err);
        setMobileLoginError('An unexpected error occurred. Please try again.');
        setAttemptPhase('error');
        waitingForIIRef.current = false;
        endAttempt();
        diagnostics.completeAttempt('error', 'Mobile login exception');
      }
    } else {
      // Use standard desktop login path
      // Call login() immediately with no awaits or timers before it
      // This preserves the user gesture for Chrome's popup requirements
      // Note: login() now internally clears any existing delegation first
      iiLogin();
    }
  }, [startAttempt, iiLogin, mobileLogin, endAttempt, diagnostics]);

  const handleRetryOnboardingCheck = useCallback(() => {
    setOnboardingCheckError(null);
    setAttemptPhase('idle');
    setValidatedIdentity(false);
    diagnostics.reset();
    onboardingCheckTimeout.reset();
    
    if (iiIdentity && actor && !actorFetching) {
      setAttemptPhase('checking-access');
      diagnostics.startAttempt();
      diagnostics.transitionStep('onboarding-check');
      
      // Check onboarding status from localStorage
      const hasOnboardingResult = !!onboardingResult;
      onboardingCheckTimeout.reset();
      setAttemptPhase('redirecting');
      diagnostics.transitionStep('navigation', { destination: hasOnboardingResult ? '/weekly-mountain' : '/onboarding' });
      
      if (hasOnboardingResult) {
        navigate({ to: '/weekly-mountain' });
      } else {
        navigate({ to: '/onboarding' });
      }
      diagnostics.completeAttempt('success', 'Retry successful');
    }
  }, [iiIdentity, actor, actorFetching, navigate, diagnostics, onboardingCheckTimeout, onboardingResult]);

  const handleRetry = useCallback(() => {
    // Force reset the attempt guard to ensure clean retry
    forceReset();
    waitingForIIRef.current = false;
    popupOpenDetectedRef.current = false;
    setAttemptPhase('idle');
    setMobileLoginError(null);
    setOnboardingCheckError(null);
    diagnostics.reset();
    validationTimeout.reset();
    actorReadyTimeout.reset();
    onboardingCheckTimeout.reset();
    
    // Small delay to ensure UI updates before retry
    setTimeout(() => {
      handleIILogin();
    }, 100);
  }, [forceReset, handleIILogin, diagnostics, validationTimeout, actorReadyTimeout, onboardingCheckTimeout]);

  const handleReturnToLanding = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  const handleLogout = useCallback(() => {
    if (iiIdentity) {
      iiClear();
    }
    navigate({ to: '/' });
  }, [iiIdentity, iiClear, navigate]);

  // Parse error message for user-friendly display
  const getErrorMessage = (error: Error | undefined): string | null => {
    if (!error) return null;
    
    const errorMsg = error.message || error.toString();
    
    // Don't show "already authenticated" as an error (we handle this by clearing)
    if (errorMsg.toLowerCase().includes('already authenticated')) {
      return null;
    }
    
    // Provide user-friendly messages for common errors
    if (errorMsg.toLowerCase().includes('user interrupt') || errorMsg.toLowerCase().includes('cancelled')) {
      return 'Login was cancelled. Please try again when you\'re ready.';
    }
    
    if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (errorMsg.toLowerCase().includes('timeout')) {
      return 'Login timed out. Please try again.';
    }
    
    // Generic fallback
    return 'Unable to connect to Internet Identity. Please try again.';
  };

  const errorMessage = getErrorMessage(iiLoginError);
  const isProcessing = isAttempting && attemptPhase !== 'error';
  
  const getButtonLabel = () => {
    if (attemptPhase === 'connecting') return 'Connecting...';
    if (attemptPhase === 'validating') return 'Validating...';
    if (attemptPhase === 'checking-access') return 'Loading...';
    if (attemptPhase === 'redirecting') return 'Redirecting...';
    return 'Log in with Internet Identity';
  };

  // Show stalled help when stalled OR when in error phase with mobile login error
  const showHelp = stalledState.isStalled || (attemptPhase === 'error' && mobileLoginError);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md mx-auto space-y-4">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-bold text-card-foreground">
              Log In to SweetSteps
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Welcome back! Continue your climb and keep making sweet progress toward your goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warmup banner */}
            <CanisterWarmupBanner state={warmup.state} onRetry={warmup.retry} />

            {/* Always-visible auth status banner */}
            <AuthStatusBanner flowState={diagnostics.state} onRetry={handleRetry} />

            <Button
              size="lg"
              className="w-full text-base font-semibold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleIILogin}
              disabled={isProcessing || iiInitializing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {getButtonLabel()}
                </>
              ) : (
                'Log in with Internet Identity'
              )}
            </Button>

            {showHelp && (
              <AuthPopupHelpPanel onRetry={handleRetry} />
            )}

            {errorMessage && (
              <AuthErrorPanel
                message={errorMessage}
                onRetry={handleRetry}
                onReturnToLanding={handleReturnToLanding}
              />
            )}

            {mobileLoginError && !showHelp && (
              <AuthErrorPanel
                message={mobileLoginError}
                onRetry={handleRetry}
                onReturnToLanding={handleReturnToLanding}
              />
            )}

            {onboardingCheckError && (
              <AuthErrorPanel
                message={onboardingCheckError}
                onRetry={handleRetryOnboardingCheck}
                onReturnToLanding={handleReturnToLanding}
              />
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
