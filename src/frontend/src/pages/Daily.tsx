import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

// Define the new Daily SweetSteps data shape
type DailyStep = {
  task: string;
  time: number;
};

type DailyData = {
  steps: DailyStep[];
};

// Placeholder data for layout preview
const placeholderData: DailyData = {
  steps: [
    { task: "Review project goals and priorities", time: 15 },
    { task: "Complete morning workout routine", time: 25 },
    { task: "Respond to important emails", time: 10 },
    { task: "Work on main project deliverable", time: 45 },
    { task: "Team sync meeting", time: 30 },
    { task: "Review and update task list", time: 10 }
  ]
};

export default function Daily() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Daily SweetSteps</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-foreground">
              Today's SweetSteps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {placeholderData.steps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
              >
                <div className="flex-1">
                  <p className="text-base text-foreground font-medium">
                    {step.task}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.time} min</span>
                </div>
              </div>
            ))}
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
