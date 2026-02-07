import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStabilization } from '../hooks/useAuthStabilization';
import { useActor } from '../hooks/useActor';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { generateOnboardingPlan } from '../lib/aiProxyClient';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';

const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';

export default function Onboarding() {
  const { isAuthStabilized, isAuthenticated } = useAuthStabilization();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const saveProfileMutation = useSaveCallerUserProfile();
  const navigate = useNavigate();
  const { setOnboardingResult } = useOnboardingResult();

  const [currentStep, setCurrentStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [currentStanding, setCurrentStanding] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to step 1 on mount to ensure fresh start when navigating from Onboarding Incomplete screen
  useEffect(() => {
    console.log('[Onboarding] Component mounted, resetting to step 1');
    setCurrentStep(1);
  }, []);

  // Check if user has already completed onboarding (has a profile in backend)
  useEffect(() => {
    if (profileLoading || !profileFetched || isSubmitting) {
      return;
    }

    if (userProfile !== null) {
      // User has already completed onboarding
      // Check Sweet Summit seen status to determine where to redirect
      const hasSeenSweetSummit = localStorage.getItem(SWEET_SUMMIT_SEEN_KEY);
      
      if (hasSeenSweetSummit === 'false') {
        // First login after onboarding - show Sweet Summit
        console.log('[Onboarding] User has profile but has not seen Sweet Summit, redirecting to /sweet-summit');
        navigate({ to: '/sweet-summit' });
      } else {
        // Subsequent login - go to weekly mountain
        console.log('[Onboarding] User already has a profile and has seen Sweet Summit, redirecting to /weekly-mountain');
        navigate({ to: '/weekly-mountain' });
      }
    }
  }, [userProfile, profileLoading, profileFetched, isSubmitting, navigate]);

  // Redirect to signup only after auth stabilizes and we confirm user is not authenticated
  useEffect(() => {
    // Wait for auth to stabilize before making routing decisions
    if (!isAuthStabilized) {
      console.log('[Onboarding] Auth not yet stabilized, waiting...');
      return;
    }

    // Wait for actor initialization to complete
    if (actorFetching) {
      console.log('[Onboarding] Actor still fetching, waiting...');
      return;
    }

    // Only redirect if we're certain the user is not authenticated after stabilization
    if (!isAuthenticated) {
      console.log('[Onboarding] Not authenticated after stabilization, redirecting to /signup');
      navigate({ to: '/signup' });
    } else {
      console.log('[Onboarding] User is authenticated, staying on /onboarding');
    }
  }, [isAuthStabilized, isAuthenticated, actorFetching, navigate]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !isSubmitting) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!actor) {
      setError('Unable to connect to the backend. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call the external AI proxy API with validation
      const aiResponse = await generateOnboardingPlan(goal, currentStanding, timeframe);

      // Prepare the complete onboarding result
      const completeResult = {
        answers: {
          vagueGoal: goal,
          currentProgress: currentStanding,
          timeLimit: timeframe,
        },
        aiResponse,
      };

      // Store in context (which persists to localStorage)
      setOnboardingResult(completeResult);

      // Save to backend to mark onboarding as complete
      // Store the bigGoal in the name field (backend limitation)
      await saveProfileMutation.mutateAsync({
        name: aiResponse.bigGoal,
        createdAt: BigInt(Date.now() * 1000000), // Convert to nanoseconds
      });

      // Mark that user has NOT yet seen Sweet Summit (first login)
      localStorage.setItem(SWEET_SUMMIT_SEEN_KEY, 'false');

      console.log('[Onboarding] Saved profile to backend and stored onboarding result');
      console.log('[Onboarding] Navigating to /sweet-summit');

      // Navigate to Sweet Summit page
      navigate({ to: '/sweet-summit' });
    } catch (err: any) {
      console.error('Error submitting onboarding:', err);
      // Surface the error message from the AI proxy client or backend
      setError(err.message || 'Unable to process your onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while auth is stabilizing or actor/profile is loading
  if (!isAuthStabilized || actorFetching || profileLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const canContinueStep1 = goal.trim().length > 0;
  const canContinueStep2 = currentStanding.trim().length > 0;
  const canSubmit = timeframe.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-bold text-card-foreground">
              Let's set up your journey
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Step {currentStep} of 3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: What's your goal? */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="goal" className="text-lg font-semibold text-foreground">
                    What's your goal?
                  </Label>
                  <Input
                    id="goal"
                    type="text"
                    placeholder="e.g., Learn to play guitar, Run a marathon, Build a business..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="h-12 text-base rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={!canContinueStep1}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Where are you right now? */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="currentStanding" className="text-lg font-semibold text-foreground">
                    Where are you right now with this goal?
                  </Label>
                  <Input
                    id="currentStanding"
                    type="text"
                    placeholder="e.g., Complete beginner, Have some experience, Almost there..."
                    value={currentStanding}
                    onChange={(e) => setCurrentStanding(e.target.value)}
                    className="h-12 text-base rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBack}
                    className="rounded-xl border-border bg-card hover:bg-muted text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={!canContinueStep2}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Timeframe */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="timeframe" className="text-lg font-semibold text-foreground">
                    When do you want to achieve this?
                  </Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger 
                      id="timeframe"
                      className="h-12 text-base rounded-xl bg-card border-border text-foreground"
                    >
                      <SelectValue placeholder="Select a timeframe" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="1-month" className="text-foreground hover:bg-muted">
                        1 month
                      </SelectItem>
                      <SelectItem value="3-months" className="text-foreground hover:bg-muted">
                        3 months
                      </SelectItem>
                      <SelectItem value="6-months" className="text-foreground hover:bg-muted">
                        6 months
                      </SelectItem>
                      <SelectItem value="1-year" className="text-foreground hover:bg-muted">
                        1 year
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="rounded-xl border-border bg-card hover:bg-muted text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating your plan...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
