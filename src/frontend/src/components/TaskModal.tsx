import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  task: {
    title: string;
    description: string;
    estimatedMinutes: number;
  };
  onClose: () => void;
  onComplete: () => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export default function TaskModal({ isOpen, task, onClose, onComplete }: TaskModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(task.estimatedMinutes);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal closes or task changes
  useEffect(() => {
    if (!isOpen) {
      resetTimer();
    }
  }, [isOpen]);

  // Initialize selected minutes when task changes
  useEffect(() => {
    if (isOpen) {
      setSelectedMinutes(Math.min(Math.max(task.estimatedMinutes, 5), 60));
    }
  }, [task.estimatedMinutes, isOpen]);

  // Timer countdown logic
  useEffect(() => {
    if (timerState === 'running' && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setTimerState('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerState === 'paused' || timerState === 'idle') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, remainingSeconds]);

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState('idle');
    setRemainingSeconds(0);
    setSelectedMinutes(Math.min(Math.max(task.estimatedMinutes, 5), 60));
  };

  const handleStartTimer = () => {
    setRemainingSeconds(selectedMinutes * 60);
    setTimerState('running');
  };

  const handlePauseTimer = () => {
    setTimerState('paused');
  };

  const handleResumeTimer = () => {
    setTimerState('running');
  };

  const handleCancelTimer = () => {
    resetTimer();
  };

  const handleYes = () => {
    onComplete();
    onClose();
    // Reset will happen via useEffect when isOpen becomes false
  };

  const handleNo = () => {
    resetTimer();
  };

  const handleClose = () => {
    resetTimer();
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-heading text-foreground mb-2">
              {task.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {task.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {timerState === 'idle' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Set Timer
                  </span>
                  <span className="text-lg font-semibold text-primary">
                    {selectedMinutes} min
                  </span>
                </div>
                <Slider
                  value={[selectedMinutes]}
                  onValueChange={(value) => setSelectedMinutes(value[0])}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>

              <Button
                onClick={handleStartTimer}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg transition-all"
                size="lg"
              >
                Start Timer
              </Button>
            </>
          )}

          {(timerState === 'running' || timerState === 'paused') && (
            <>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-6xl font-bold text-primary font-mono tracking-tight">
                  {formatTime(remainingSeconds)}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {timerState === 'running' ? 'Timer running...' : 'Timer paused'}
                </p>
              </div>

              <div className="flex gap-3">
                {timerState === 'running' ? (
                  <Button
                    onClick={handlePauseTimer}
                    variant="secondary"
                    className="flex-1 py-6 rounded-xl font-semibold"
                    size="lg"
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={handleResumeTimer}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold"
                    size="lg"
                  >
                    Resume
                  </Button>
                )}
                <Button
                  onClick={handleCancelTimer}
                  variant="outline"
                  className="flex-1 py-6 rounded-xl font-semibold border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  size="lg"
                >
                  Cancel Timer
                </Button>
              </div>
            </>
          )}

          {timerState === 'finished' && (
            <>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-heading text-foreground mb-2">
                  Time's Up!
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Did you finish this task?
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleYes}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold shadow-lg"
                  size="lg"
                >
                  Yes, I Finished! 🍫
                </Button>
                <Button
                  onClick={handleNo}
                  variant="outline"
                  className="flex-1 py-6 rounded-xl font-semibold"
                  size="lg"
                >
                  No, Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
