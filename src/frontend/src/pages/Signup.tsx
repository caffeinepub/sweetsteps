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
  const { login: iiLogin, clear: iiClear, loginError: iiLoginError, identity: iiIdentity, loginStatus: iiLoginStatus, isInitializing: iiInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
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
        // Wait for profile to be fetched
        if (profileLoading || !profileFetched) {
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
  }, [validatedIdentity, iiIdentity, actor, actorFetching, navigate, attemptPhase, diagnostics, actorReadyTimeout, userProfile, profileLoading, profileFetched, endAttempt]);

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

  // Track actor readiness - ONLY if user initiated auth
  useEffect(() => {
    // CRITICAL: Only track actor if user initiated auth in this visit
    if (!userInitiatedAuthRef.current) {
      return;
    }

    if (attemptPhase === 'validating' && validatedIdentity && actor) {
      diagnostics.transitionStep('actor-ready');
    }
  }, [attemptPhase, validatedIdentity, actor, diagnostics]);

  const handleIISignup = useCallback(async () => {
    // Guard against re-entrancy
    if (!startAttempt()) {
      return;
    }
    
    // CRITICAL: Mark that user has initiated auth in this visit
    userInitiatedAuthRef.current = true;
    
    // Start diagnostics
    diagnostics.startAttempt();
    
    // Clear validation state and errors (synchronous)
    setValidatedIdentity(false);
    setMobileLoginError(null);
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
          const errorMsg = result.error || 'Signup failed. Please try again.';
          setMobileLoginError(errorMsg);
          setAttemptPhase('error');
          waitingForIIRef.current = false;
          endAttempt();
          diagnostics.completeAttempt('error', errorMsg);
        }
      } catch (err) {
        console.error('Mobile signup error:', err);
        setMobileLoginError('An unexpected error occurred. Please try again.');
        setAttemptPhase('error');
        waitingForIIRef.current = false;
        endAttempt();
        diagnostics.completeAttempt('error', 'Mobile signup exception');
      }
    } else {
      // Use standard desktop login path
      // Call login() immediately with no awaits or timers before it
      // This preserves the user gesture for Chrome's popup requirements
      iiLogin();
    }
  }, [startAttempt, iiLogin, mobileLogin, endAttempt, diagnostics]);

  const handleRetry = useCallback(() => {
    // Force reset and retry II login
    forceReset();
    waitingForIIRef.current = false;
    popupOpenDetectedRef.current = false;
    setAttemptPhase('idle');
    setMobileLoginError(null);
    diagnostics.reset();
    validationTimeout.reset();
    actorReadyTimeout.reset();
    
    // Small delay to ensure UI updates before retry
    setTimeout(() => {
      handleIISignup();
    }, 100);
  }, [forceReset, handleIISignup, diagnostics, validationTimeout, actorReadyTimeout]);

  const handleReturnToLanding = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  // Parse error message for user-friendly display
  const getErrorMessage = (error: Error | undefined): string | null => {
    if (!error) return null;
    
    const errorMsg = error.message || error.toString();
    
    // Don't show "already authenticated" as an error
    if (errorMsg.toLowerCase().includes('already authenticated')) {
      return null;
    }
    
    // Provide user-friendly messages for common errors
    if (errorMsg.toLowerCase().includes('user interrupt') || errorMsg.toLowerCase().includes('cancelled')) {
      return 'Signup was cancelled. Please try again when you\'re ready.';
    }
    
    if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (errorMsg.toLowerCase().includes('timeout')) {
      return 'Signup timed out. Please try again.';
    }
    
    // Generic fallback
    return 'Unable to connect to Internet Identity. Please try again.';
  };

  const errorMessage = getErrorMessage(iiLoginError);
  const isProcessing = isAttempting && attemptPhase !== 'error';
  
  const getButtonLabel = () => {
    if (attemptPhase === 'connecting') return 'Connecting...';
    if (attemptPhase === 'validating') return 'Validating...';
    if (attemptPhase === 'checking-profile') return 'Checking...';
    if (attemptPhase === 'waiting-for-display-name') return 'Please complete setup...';
    if (attemptPhase === 'redirecting') return 'Redirecting...';
    return 'Sign up with Internet Identity';
  };

  // Show stalled help when stalled OR when in error phase with mobile login error
  const showHelp = stalledState.isStalled || (attemptPhase === 'error' && mobileLoginError);

  // If auto-redirecting, show a loading state
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md mx-auto space-y-4">
          <Card className="bg-transparent border-0 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Redirecting...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md mx-auto space-y-4">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-bold text-card-foreground">
              Create your SweetSteps account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Start your journey to consistent progress. Create your account to begin climbing your goals.
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
              onClick={handleIISignup}
              disabled={isProcessing || iiInitializing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {getButtonLabel()}
                </>
              ) : (
                'Sign up with Internet Identity'
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
