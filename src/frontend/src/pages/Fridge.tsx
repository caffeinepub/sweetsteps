import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AuthenticatedHeader from '../components/AuthenticatedHeader';

type Period = 'week' | 'month' | 'allTime';

// Hardcoded placeholder data for each period
const inventoryData: Record<Period, { tiny: number; bars: number; slabs: number }> = {
  week: {
    tiny: 12,
    bars: 3,
    slabs: 1,
  },
  month: {
    tiny: 48,
    bars: 15,
    slabs: 5,
  },
  allTime: {
    tiny: 156,
    bars: 42,
    slabs: 18,
  },
};

export default function Fridge() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');

  const currentInventory = inventoryData[selectedPeriod];

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header with Logout and Delete Account */}
      <AuthenticatedHeader title="Your Chocolate Fridge" />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6 h-full">
          {/* Period Toggle Buttons */}
          <div className="flex justify-center gap-2 flex-shrink-0 flex-nowrap">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="default"
              onClick={() => setSelectedPeriod('week')}
              className="px-4 font-semibold rounded-xl"
            >
              This Week
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="default"
              onClick={() => setSelectedPeriod('month')}
              className="px-4 font-semibold rounded-xl"
            >
              This Month
            </Button>
            <Button
              variant={selectedPeriod === 'allTime' ? 'default' : 'outline'}
              size="default"
              onClick={() => setSelectedPeriod('allTime')}
              className="px-4 font-semibold rounded-xl"
            >
              All Time
            </Button>
          </div>

          {/* Inventory Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
            {/* Tiny Chocolates */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 h-full flex items-center gap-4">
                <div className="text-4xl flex-shrink-0">🍫</div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Tiny</p>
                  <p className="text-3xl font-bold text-foreground">{currentInventory.tiny}</p>
                </div>
              </CardContent>
            </Card>

            {/* Bars */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 h-full flex items-center gap-4">
                <div className="text-4xl flex-shrink-0">🍫</div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Bars</p>
                  <p className="text-3xl font-bold text-foreground">{currentInventory.bars}</p>
                </div>
              </CardContent>
            </Card>

            {/* Slabs */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 h-full flex items-center gap-4">
                <div className="text-4xl flex-shrink-0">🍫</div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Slabs</p>
                  <p className="text-3xl font-bold text-foreground">{currentInventory.slabs}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 border-t border-border flex-shrink-0">
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
