import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Mountain, Target, Footprints } from 'lucide-react';
import { generateOnboardingPlan, type OnboardingPlanResponse } from '../lib/aiProxyClient';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { toSafeString } from '../utils/safeRender';

export default function Onboarding() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const navigate = useNavigate();
  const { onboardingResult, setOnboardingResult, clearOnboardingResult } = useOnboardingResult();

  const [currentStep, setCurrentStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [currentStanding, setCurrentStanding] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<OnboardingPlanResponse | null>(null);
  const [carouselSlide, setCarouselSlide] = useState(0);

  // Check if user has already completed onboarding
  useEffect(() => {
    if (onboardingResult) {
      // User has already completed onboarding, redirect to Weekly Mountain
      console.log('[Onboarding] User already has onboarding result, redirecting to weekly-mountain');
      navigate({ to: '/weekly-mountain' });
    } else {
      // Clear any stale persisted onboarding result when starting fresh
      clearOnboardingResult();
    }
  }, [onboardingResult, navigate, clearOnboardingResult]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!identity && !actorFetching) {
      navigate({ to: '/signup' });
    }
  }, [identity, actorFetching, navigate]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (currentStep !== 4) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && carouselSlide < 2) {
        setCarouselSlide(carouselSlide + 1);
      } else if (e.key === 'ArrowLeft' && carouselSlide > 0) {
        setCarouselSlide(carouselSlide - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, carouselSlide]);

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
      
      setPlanData(aiResponse);

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

      // Verify the data was stored correctly
      console.log('[Onboarding] Stored onboarding result:', completeResult);

      // Move to Sweet Summit screen (step 4)
      setCurrentStep(4);
      setCarouselSlide(0);
    } catch (err: any) {
      console.error('Error submitting onboarding:', err);
      // Surface the error message from the AI proxy client
      setError(err.message || 'Unable to process your onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextSlide = () => {
    if (carouselSlide < 2) {
      setCarouselSlide(carouselSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (carouselSlide > 0) {
      setCarouselSlide(carouselSlide - 1);
    }
  };

  const handleStartJourney = () => {
    console.log('[Onboarding] Navigating to Weekly Mountain');
    navigate({ to: '/weekly-mountain' });
  };

  if (!identity) {
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

  const carouselSlides = planData ? [
    {
      icon: Target,
      title: 'Your Big Goal',
      content: toSafeString(planData.bigGoal),
      color: 'from-primary/20 to-accent/20'
    },
    {
      icon: Mountain,
      title: 'Your First Weekly Mountain',
      content: (
        <div className="space-y-3 text-left">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-1">
              {toSafeString(planData.weeklyMountain.name)}
            </h4>
            <p className="text-muted-foreground text-sm">Weekly Target</p>
            <p className="text-foreground">{toSafeString(planData.weeklyMountain.weeklyTarget)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Note</p>
            <p className="text-foreground">{toSafeString(planData.weeklyMountain.note)}</p>
          </div>
        </div>
      ),
      color: 'from-accent/20 to-secondary/20'
    },
    {
      icon: Footprints,
      title: 'Sample Daily SweetStep',
      content: toSafeString(planData.dailyStep),
      color: 'from-secondary/20 to-primary/20'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-bold text-card-foreground">
              {currentStep === 4 ? 'Sweet Summit' : "Let's set up your journey"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {currentStep === 4 ? 'Your personalized plan is ready!' : `Step ${currentStep} of 3`}
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
                    placeholder="e.g., Complete beginner, Have some experience, Halfway there..."
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

            {/* Step 3: When do you want to reach your goal? */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="timeframe" className="text-lg font-semibold text-foreground">
                    When do you want to reach your goal?
                  </Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger 
                      id="timeframe"
                      className="h-12 text-base rounded-xl bg-card border-border text-foreground"
                    >
                      <SelectValue placeholder="Select a timeframe" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="1 month" className="text-foreground">1 month</SelectItem>
                      <SelectItem value="3 months" className="text-foreground">3 months</SelectItem>
                      <SelectItem value="6 months" className="text-foreground">6 months</SelectItem>
                      <SelectItem value="1 year" className="text-foreground">1 year</SelectItem>
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
                        Generating your plan...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Sweet Summit - Carousel */}
            {currentStep === 4 && planData && (
              <div className="space-y-6">
                {/* Carousel Content */}
                <div className="relative overflow-hidden min-h-[320px] md:min-h-[280px]">
                  {carouselSlides.map((slide, index) => {
                    const IconComponent = slide.icon;
                    return (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                          index === carouselSlide
                            ? 'opacity-100 translate-x-0'
                            : index < carouselSlide
                            ? 'opacity-0 -translate-x-full'
                            : 'opacity-0 translate-x-full'
                        }`}
                      >
                        <Card className="bg-background border-border h-full">
                          <CardContent className="p-6 md:p-8 space-y-4 flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center border border-border`}>
                              <IconComponent className="w-10 h-10 text-foreground" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-foreground">{slide.title}</h3>
                            <div className="text-muted-foreground leading-relaxed text-base md:text-lg max-w-md">
                              {typeof slide.content === 'string' ? (
                                <p className="whitespace-pre-wrap">{slide.content}</p>
                              ) : (
                                slide.content
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={goToPrevSlide}
                    disabled={carouselSlide === 0}
                    className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>

                  {/* Slide Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">
                      {carouselSlide + 1} of {carouselSlides.length}
                    </span>
                    <div className="flex gap-1.5">
                      {carouselSlides.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCarouselSlide(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === carouselSlide
                              ? 'bg-primary w-6'
                              : 'bg-muted hover:bg-muted-foreground'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={goToNextSlide}
                    disabled={carouselSlide === carouselSlides.length - 1}
                    className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next slide"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* Start Your Journey Button - Only on last slide */}
                {carouselSlide === 2 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={handleStartJourney}
                      className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                    >
                      Start Your Journey
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
