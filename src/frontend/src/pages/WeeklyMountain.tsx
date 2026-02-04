import { Mountain } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Placeholder data
const placeholderMountain = {
  name: 'Foundation Week',
  weeklyTarget: 'Complete 5 daily SweetSteps',
  note: 'This week is all about building momentum. Focus on consistency over perfection. Each small step brings you closer to your big goal!',
};

const placeholderProgress = {
  percentage: 60,
  daysActive: 3,
  percentComplete: 60,
};

export default function WeeklyMountain() {
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-bold text-foreground">{placeholderMountain.name}</h1>
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
                {placeholderProgress.percentage}%
              </div>
              <p className="text-muted-foreground text-lg">Weekly Progress</p>
            </div>

            {/* Progress Bar */}
            <Progress value={placeholderProgress.percentage} className="h-3" />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-xl bg-background border border-border">
                <p className="text-2xl font-bold text-foreground">{placeholderProgress.daysActive}</p>
                <p className="text-sm text-muted-foreground">days active this week</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background border border-border">
                <p className="text-2xl font-bold text-foreground">{placeholderProgress.percentComplete}%</p>
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
              {placeholderMountain.note}
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
