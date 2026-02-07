import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, AlertCircle, Mountain } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import TaskModal from '@/components/TaskModal';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { useAuthStabilization } from '../hooks/useAuthStabilization';
import { generateDailySteps, type DailyTask } from '../lib/aiProxyClient';
import { deriveDailyInputs } from '../utils/dailyInputs';
import AuthenticatedHeader from '../components/AuthenticatedHeader';
import { useAddReward } from '../hooks/useRewards';
import { RewardType } from '../backend';

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
  const navigate = useNavigate();
  const { onboardingResult } = useOnboardingResult();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched, isSettled: profileSettled } = useGetCallerUserProfile();
  const { isSettled, isAuthenticated } = useAuthStabilization();

  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const addRewardMutation = useAddReward();
  
  // Track which tasks have been rewarded in this session to prevent duplicates
  const rewardedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchDailySteps = async () => {
      // Wait for auth to settle and profile to be fetched before deciding
      if (!isSettled || profileLoading) {
        console.log('[Daily] Waiting for auth/profile resolution...');
        return;
      }

      // Attempt to derive inputs from available sources
      const goalFromOnboarding = onboardingResult?.aiResponse?.bigGoal;
      const weeklyMountainFromOnboarding = onboardingResult?.aiResponse?.weeklyMountain;
      const goalFromProfile = userProfile?.name; // Backend stores bigGoal in name field

      const inputsResult = deriveDailyInputs(
        goalFromOnboarding,
        weeklyMountainFromOnboarding,
        goalFromProfile
      );

      if (!inputsResult.success) {
        console.log('[Daily] No valid inputs available from any source');
        setIsLoading(false);
        setTasks([]);
        return;
      }

      console.log('[Daily] Using inputs from source:', inputsResult.source);
      setIsLoading(true);
      setError(null);

      try {
        const response = await generateDailySteps(
          inputsResult.inputs!.bigGoal,
          inputsResult.inputs!.weeklyMountain
        );
        // Safely guard against missing or invalid tasks
        setTasks(Array.isArray(response?.tasks) ? response.tasks : []);
      } catch (err: any) {
        console.error('[Daily] Error fetching daily steps:', err);
        // Surface the error message from the AI proxy client
        setError(err.message || 'Unable to load daily steps. Please try again.');
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailySteps();
  }, [isSettled, profileLoading, onboardingResult, userProfile]);

  const handleTaskClick = (task: DailyTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskComplete = async () => {
    if (!selectedTask) return;
    
    // Create a unique identifier for this task completion
    const taskId = `${selectedTask.title}-${formatTodayDate()}`;
    
    // Check if we've already rewarded this task today
    if (rewardedTasksRef.current.has(taskId)) {
      console.log('Task already rewarded today:', taskId);
      return;
    }
    
    // Mark as rewarded before making the call to prevent duplicate clicks
    rewardedTasksRef.current.add(taskId);
    
    try {
      // Award tiny chocolate for completing a daily task
      await addRewardMutation.mutateAsync(RewardType.tinyChocolate);
      console.log('Tiny chocolate awarded for task:', selectedTask.title);
    } catch (err: any) {
      console.error('Error awarding chocolate:', err);
      // Remove from rewarded set on error so user can retry
      rewardedTasksRef.current.delete(taskId);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleViewWeeklyMountain = () => {
    navigate({ to: '/weekly-mountain' });
  };

  const handleStartOnboarding = () => {
    console.log('[Daily] Start Onboarding clicked, navigating to /onboarding');
    navigate({ to: '/onboarding' });
  };

  // Show loading while auth is settling or profile is loading
  if (!isSettled || profileLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching daily steps
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

  // Show AI proxy error (network/API failures)
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

  // Determine if inputs are available from any source
  const goalFromOnboarding = onboardingResult?.aiResponse?.bigGoal;
  const weeklyMountainFromOnboarding = onboardingResult?.aiResponse?.weeklyMountain;
  const goalFromProfile = userProfile?.name;

  const inputsResult = deriveDailyInputs(
    goalFromOnboarding,
    weeklyMountainFromOnboarding,
    goalFromProfile
  );

  // Only show "Onboarding Incomplete" if:
  // 1. Auth is settled and authenticated
  // 2. Profile query has completed (settled)
  // 3. No backend profile exists
  // 4. No onboarding result in context
  // 5. No valid inputs can be derived
  const showOnboardingIncomplete = 
    isSettled && 
    isAuthenticated && 
    profileSettled && 
    !userProfile && 
    !onboardingResult && 
    !inputsResult.success;

  if (showOnboardingIncomplete) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Onboarding Incomplete</AlertTitle>
            <AlertDescription>
              You haven't finished onboarding yet. Let's get you started!
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Button
              onClick={handleStartOnboarding}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Onboarding
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state when no tasks are available
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header with Logout and Delete Account */}
        <AuthenticatedHeader title="Today's SweetSteps" subtitle={formatTodayDate()} />

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tasks available yet. Your daily steps will appear here once generated.
            </AlertDescription>
          </Alert>

          {/* View Weekly Mountain Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleViewWeeklyMountain}
              variant="outline"
              className="rounded-xl"
            >
              <Mountain className="mr-2 h-4 w-4" />
              View Weekly Mountain
            </Button>
          </div>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Logout and Delete Account */}
      <AuthenticatedHeader title="Today's SweetSteps" subtitle={formatTodayDate()} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
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

        {/* View Weekly Mountain Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleViewWeeklyMountain}
            variant="outline"
            className="rounded-xl"
          >
            <Mountain className="mr-2 h-4 w-4" />
            View Weekly Mountain
          </Button>
        </div>
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
