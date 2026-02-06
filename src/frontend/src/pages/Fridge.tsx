import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthenticatedHeader from '../components/AuthenticatedHeader';
import { useGetRewardsForCaller } from '../hooks/useRewards';
import { TimeRange } from '../backend';

export default function Fridge() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TimeRange.week);
  
  const { data: inventory, isLoading, error, refetch } = useGetRewardsForCaller(selectedTimeRange);

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  const timeRangeLabels = {
    [TimeRange.week]: 'This Week',
    [TimeRange.month]: 'This Month',
    [TimeRange.all]: 'All Time'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your chocolate fridge...</p>
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
            <AlertDescription>
              {error instanceof Error ? error.message : 'Unable to load chocolate fridge. Please try again.'}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Button
              onClick={() => refetch()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Logout and Delete Account */}
      <AuthenticatedHeader title="Chocolate Fridge" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Time Range Selector */}
        <div className="flex justify-center gap-2">
          {Object.values(TimeRange).map((range) => (
            <Button
              key={range}
              variant={selectedTimeRange === range ? 'default' : 'outline'}
              onClick={() => handleTimeRangeChange(range)}
              className="rounded-xl"
            >
              {timeRangeLabels[range]}
            </Button>
          ))}
        </div>

        {/* Reward Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tiny Chocolates */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="text-5xl">🍫</div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {inventory ? Number(inventory.tinyChocolateCount) : 0}
                </p>
                <p className="text-sm text-muted-foreground">Tiny Chocolates</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Earned from daily tasks
              </p>
            </CardContent>
          </Card>

          {/* Chocolate Bars */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="text-5xl">🍫</div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {inventory ? Number(inventory.chocolateBarCount) : 0}
                </p>
                <p className="text-sm text-muted-foreground">Chocolate Bars</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Earned from weekly goals
              </p>
            </CardContent>
          </Card>

          {/* Chocolate Slabs */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="text-5xl">🍫</div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {inventory ? Number(inventory.chocolateSlabCount) : 0}
                </p>
                <p className="text-sm text-muted-foreground">Chocolate Slabs</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Earned from big goals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Message */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Keep climbing your mountains to earn more sweet rewards! 🏔️
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-border mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground text-xs md:text-sm">
            © 2026. Built with 🤎 using{' '}
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
