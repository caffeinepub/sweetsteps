import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { generateWeeklyMountain, type WeeklyMountainResponse } from '../lib/aiProxyClient';

// Helper to get current week identifier (ISO week number)
function getCurrentWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber}`;
}

export default function WeeklyMountain() {
  const navigate = useNavigate();
  const { onboardingResult } = useOnboardingResult();

  const [mountain, setMountain] = useState<WeeklyMountainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyMountain = async () => {
      if (!onboardingResult?.aiResponse?.bigGoal) {
        setIsLoading(false);
        return;
      }

      const currentWeekId = getCurrentWeekId();
      const storedWeekId = localStorage.getItem('sweetsteps_current_week');
      const storedMountain = localStorage.getItem('sweetsteps_weekly_mountain');

      // If we have a stored mountain for the current week, use it
      if (storedWeekId === currentWeekId && storedMountain) {
        try {
          setMountain(JSON.parse(storedMountain));
          setIsLoading(false);
          return;
        } catch {
          // Invalid stored data, fetch new
        }
      }

      // Fetch new weekly mountain
      setIsLoading(true);
      setError(null);

      try {
        const newMountain = await generateWeeklyMountain(onboardingResult.aiResponse.bigGoal);
        setMountain(newMountain);
        
        // Store for this week
        localStorage.setItem('sweetsteps_current_week', currentWeekId);
        localStorage.setItem('sweetsteps_weekly_mountain', JSON.stringify(newMountain));
      } catch (err: any) {
        console.error('Error fetching weekly mountain:', err);
        // Surface the error message from the AI proxy client
        setError(err.message || 'Unable to load weekly mountain. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyMountain();
  }, [onboardingResult]);

  const handleRetry = () => {
    // Clear stored data and refetch
    localStorage.removeItem('sweetsteps_weekly_mountain');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your weekly mountain...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button
              onClick={handleRetry}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Use onboarding mountain as fallback
  const displayMountain = mountain || onboardingResult?.aiResponse?.weeklyMountain;

  if (!displayMountain) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No weekly mountain data found. Please complete onboarding first.
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

  // Initial progress for first-time users (0%)
  const initialProgress = {
    percentage: 0,
    daysActive: 0,
    percentComplete: 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <img 
            src="/assets/generated/mountain-icon.dim_64x64.png" 
            alt="Mountain" 
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold text-foreground">{displayMountain.name}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Progress Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-8 space-y-6">
            {/* Big Percentage */}
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">
                {initialProgress.percentage}%
              </div>
              <p className="text-muted-foreground text-lg">Weekly Progress</p>
            </div>

            {/* Progress Bar */}
            <Progress value={initialProgress.percentage} className="h-3" />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-xl bg-background border border-border">
                <p className="text-2xl font-bold text-foreground">{initialProgress.daysActive}</p>
                <p className="text-sm text-muted-foreground">days active this week</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background border border-border">
                <p className="text-2xl font-bold text-foreground">{initialProgress.percentComplete}%</p>
                <p className="text-sm text-muted-foreground">of weekly goal complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => navigate({ to: '/daily' })}
            className="h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            View Today's SweetSteps
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate({ to: '/fridge' })}
            aria-label="Navigate to Chocolate Fridge page"
            className="h-14 text-base font-semibold rounded-xl border-border bg-card hover:bg-muted text-foreground"
          >
            Open Chocolate Fridge
          </Button>
        </div>

        {/* Coach's Note */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Coach's Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {displayMountain.note}
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-border mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground text-xs md:text-sm">
            © 2026. Built with love using{' '}
            <a 
              href="https://caffeine.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors underline underline-offset-2"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
