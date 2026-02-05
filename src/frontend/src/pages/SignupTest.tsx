import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function SignupTest() {
  const { identity, loginStatus, login, isInitializing } = useInternetIdentity();
  const { actor } = useActor();
  const navigate = useNavigate();

  // Redirect to onboarding when II authentication succeeds
  useEffect(() => {
    if (identity && actor && loginStatus === 'success') {
      navigate({ to: '/onboarding' });
    }
  }, [identity, actor, loginStatus, navigate]);

  // Also redirect if already authenticated on mount
  useEffect(() => {
    if (identity && actor && !isInitializing) {
      navigate({ to: '/onboarding' });
    }
  }, [identity, actor, isInitializing, navigate]);

  const handleIISignup = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      console.error('II signup error:', error);
    }
  }, [login]);

  const isLoggingIn = loginStatus === 'logging-in';
  const isConnecting = isInitializing || isLoggingIn;

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
            <div className="pt-2">
              <Alert className="bg-accent/10 border-accent">
                <AlertDescription className="text-center font-medium text-accent-foreground">
                  Backup signup page testing
                </AlertDescription>
              </Alert>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Internet Identity Section */}
            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full text-base font-semibold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleIISignup}
                disabled={isConnecting}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting to Internet Identity...
                  </>
                ) : isInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Sign up with Internet Identity'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
