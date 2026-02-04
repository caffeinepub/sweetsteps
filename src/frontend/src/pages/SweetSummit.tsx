import { useNavigate } from '@tanstack/react-router';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mountain, Target, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SweetSummit() {
  const { onboardingResult } = useOnboardingResult();
  const navigate = useNavigate();

  // Development-friendly empty state
  if (!onboardingResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No onboarding data found. Please complete the onboarding flow first.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button
              onClick={() => navigate({ to: '/onboarding' })}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Go to Onboarding
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { aiResponse } = onboardingResult;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
              <Mountain className="w-10 h-10 text-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Welcome to Your Sweet Summit! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            Here's your personalized plan to reach your goal
          </p>
        </div>

        {/* Big Goal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl text-foreground">Your Big Goal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground">{aiResponse.bigGoal}</p>
          </CardContent>
        </Card>

        {/* Sample Weekly Mountain */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mountain className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl text-foreground">Sample Weekly Mountain</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Here's an example of what your weekly focus could look like
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {aiResponse.weeklyMountain.name}
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Target className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weekly Target</p>
                    <p className="text-base text-foreground">{aiResponse.weeklyMountain.weeklyTarget}</p>
                  </div>
                </div>
                {aiResponse.weeklyMountain.note && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Note</p>
                      <p className="text-base text-foreground">{aiResponse.weeklyMountain.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Daily Step */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl text-foreground">Sample Daily SweetStep</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              A small, actionable step to keep you moving forward
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <p className="text-base text-foreground">{aiResponse.dailyStep}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Button - Placeholder for future */}
        <div className="text-center pt-4">
          <Button
            size="lg"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => navigate({ to: '/' })}
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
