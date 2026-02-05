import { useNavigate } from '@tanstack/react-router';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Mountain, Target, Footprints } from 'lucide-react';
import { toSafeString } from '../utils/safeRender';

export default function SweetSummit() {
  const navigate = useNavigate();
  const { onboardingResult } = useOnboardingResult();

  if (!onboardingResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Onboarding Data</CardTitle>
            <CardDescription>
              It looks like you haven't completed onboarding yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/onboarding' })} className="w-full">
              Go to Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { aiResponse } = onboardingResult;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-bold text-card-foreground">
              Sweet Summit
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Your personalized plan is ready!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Big Goal */}
            <Card className="bg-background border-border">
              <CardContent className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
                  <Target className="w-10 h-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Your Big Goal</h3>
                <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                  {toSafeString(aiResponse.bigGoal)}
                </p>
              </CardContent>
            </Card>

            {/* Weekly Mountain */}
            <Card className="bg-background border-border">
              <CardContent className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center border border-border">
                  <Mountain className="w-10 h-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Your First Weekly Mountain</h3>
                <div className="space-y-3 text-left w-full max-w-md">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">
                      {toSafeString(aiResponse.weeklyMountain.name)}
                    </h4>
                    <p className="text-muted-foreground text-sm">Weekly Target</p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {toSafeString(aiResponse.weeklyMountain.weeklyTarget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Note</p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {toSafeString(aiResponse.weeklyMountain.note)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Step */}
            <Card className="bg-background border-border">
              <CardContent className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center border border-border">
                  <Footprints className="w-10 h-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Sample Daily SweetStep</h3>
                <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                  {toSafeString(aiResponse.dailyStep)}
                </p>
              </CardContent>
            </Card>

            {/* Start Journey Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate({ to: '/weekly-mountain' })}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                Start Your Journey
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
