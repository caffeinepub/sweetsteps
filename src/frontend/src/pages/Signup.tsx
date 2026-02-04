import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useAuthAttemptGuard } from '../hooks/useAuthAttemptGuard';
import { useStalledAuthDetection } from '../hooks/useStalledAuthDetection';
import { isIdentityValid, isSessionStale } from '../utils/identityValidation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuthPopupHelpPanel } from '../components/auth/AuthPopupHelpPanel';
import { AuthErrorPanel } from '../components/auth/AuthErrorPanel';
import { AuthDiagnosticsPanel } from '../components/auth/AuthDiagnosticsPanel';
import { getUrlParameter } from '../utils/urlParams';

type AttemptPhase = 'idle' | 'connecting' | 'validating' | 'redirecting' | 'error';

export default function Signup() {
  const { login, clear, loginError, identity, loginStatus, isInitializing } = useInternetIdentity();
  const { actor } = useActor();
  const navigate = useNavigate();
  
  const [attemptPhase, setAttemptPhase] = useState<AttemptPhase>('idle');
  const [validatedIdentity, setValidatedIdentity] = useState<boolean>(false);
  
  const { isAttempting, startAttempt, endAttempt, getAttemptTimestamp } = useAuthAttemptGuard();
  const showStalledHelp = useStalledAuthDetection(getAttemptTimestamp(), loginStatus, identity);
  
  // Check for debug mode
  const debugAuth = getUrlParameter('debugAuth') === '1';

  // Clear stale sessions on mount (outside user-gesture path)
  useEffect(() => {
    if (identity && isSessionStale(identity) && attemptPhase === 'idle') {
      clear();
    }
  }, [identity, clear, attemptPhase]);

  // Validate identity when it changes
  useEffect(() => {
    if (!identity) {
      setValidatedIdentity(false);
      return;
    }

    // Only validate if we're not in the middle of an attempt
    if (attemptPhase === 'idle' || attemptPhase === 'validating') {
      const valid = isIdentityValid(identity);
      setValidatedIdentity(valid);
    }
  }, [identity, attemptPhase]);

  // Redirect authenticated users to onboarding only after validation
  useEffect(() => {
    if (!validatedIdentity || !identity || !actor) return;
    
    // Don't run if we're already redirecting
    if (attemptPhase === 'redirecting') return;

    setAttemptPhase('redirecting');
    navigate({ to: '/onboarding' });
  }, [validatedIdentity, identity, actor, navigate, attemptPhase]);

  // Track login status changes
  useEffect(() => {
    if (loginStatus === 'logging-in' && attemptPhase === 'connecting') {
      // Login initiated successfully
      return;
    }
    
    if (loginStatus === 'success' && attemptPhase === 'connecting') {
      // Login succeeded, move to validation phase
      setAttemptPhase('validating');
    }
    
    if (loginStatus === 'loginError') {
      setAttemptPhase('error');
      endAttempt();
    }
  }, [loginStatus, attemptPhase, endAttempt]);

  const handleSignup = useCallback(() => {
    // Guard against re-entrancy
    if (!startAttempt()) {
      return;
    }
    
    // Clear validation state (synchronous)
    setValidatedIdentity(false);
    setAttemptPhase('connecting');
    
    // Call login() immediately with no awaits or timers before it
    // This preserves the user gesture for Chrome's popup requirements
    login();
  }, [startAttempt, login]);

  const handleReturnToLanding = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

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

  const errorMessage = getErrorMessage(loginError);
  const isProcessing = isAttempting || attemptPhase !== 'idle';
  
  const getButtonLabel = () => {
    if (attemptPhase === 'connecting') return 'Connecting...';
    if (attemptPhase === 'validating') return 'Validating...';
    if (attemptPhase === 'redirecting') return 'Redirecting...';
    return 'Sign up with Internet Identity';
  };

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
            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full text-base font-semibold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSignup}
                disabled={isProcessing || isInitializing}
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

              {showStalledHelp && (
                <AuthPopupHelpPanel onRetry={handleSignup} />
              )}

              {errorMessage && (
                <AuthErrorPanel
                  message={errorMessage}
                  onRetry={handleSignup}
                  onReturnToLanding={handleReturnToLanding}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {debugAuth && (
          <AuthDiagnosticsPanel
            loginStatus={loginStatus}
            isLoggingIn={loginStatus === 'logging-in'}
            isInitializing={isInitializing}
            identity={identity}
          />
        )}
      </div>
    </div>
  );
}
