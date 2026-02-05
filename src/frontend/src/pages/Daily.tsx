import { useState, useEffect } from 'react';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import TaskModal from '@/components/TaskModal';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { generateDailySteps, type DailyTask } from '../lib/aiProxyClient';

// Helper to format today's date
const formatTodayDate = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export default function Daily() {
  const { onboardingResult } = useOnboardingResult();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchDailySteps = async () => {
      if (!onboardingResult?.aiResponse?.bigGoal || !onboardingResult?.aiResponse?.weeklyMountain) {
        setIsLoading(false);
        setTasks([]); // Ensure tasks is always an array
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await generateDailySteps(
          onboardingResult.aiResponse.bigGoal,
          onboardingResult.aiResponse.weeklyMountain
        );
        // Safely guard against missing or invalid tasks
        setTasks(Array.isArray(response?.tasks) ? response.tasks : []);
      } catch (err: any) {
        console.error('Error fetching daily steps:', err);
        // Surface the error message from the AI proxy client
        setError(err.message || 'Unable to load daily steps. Please try again.');
        setTasks([]); // Ensure tasks is always an array even on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailySteps();
  }, [onboardingResult]);

  const handleTaskClick = (task: DailyTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskComplete = () => {
    // Completion flow - currently no backend persistence
    console.log('Task completed:', selectedTask?.title);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your daily SweetSteps...</p>
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
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
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

  if (!onboardingResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No onboarding data found. Please complete onboarding first.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Empty state when no tasks are available
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="w-full border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-foreground">Today's SweetSteps</h1>
            <p className="text-sm text-muted-foreground mt-1">{formatTodayDate()}</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-12">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tasks available yet. Your daily steps will appear here once generated.
            </AlertDescription>
          </Alert>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Today's SweetSteps</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatTodayDate()}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div 
              key={index}
              onClick={() => handleTaskClick(task)}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <p className="text-base text-foreground font-medium">
                  {task.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{task.estimatedMinutes} min</span>
              </div>
            </div>
          ))}
        </div>
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

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          isOpen={isModalOpen}
          task={selectedTask}
          onClose={handleModalClose}
          onComplete={handleTaskComplete}
        />
      )}
    </div>
  );
}
