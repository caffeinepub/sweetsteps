import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CanisterWarmupBannerProps {
  state: 'idle' | 'warming' | 'ready' | 'failed';
  onRetry: () => void;
}

export function CanisterWarmupBanner({ state, onRetry }: CanisterWarmupBannerProps) {
  // Don't show anything when idle
  if (state === 'idle') {
    return null;
  }

  // Warming state
  if (state === 'warming') {
    return (
      <Alert className="border-primary/50 bg-primary/5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <AlertTitle className="text-sm font-medium">Waking up the backend...</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          This may take up to 60 seconds on first use. Your login will be faster once ready.
        </AlertDescription>
      </Alert>
    );
  }

  // Ready state - show briefly then auto-hide
  if (state === 'ready') {
    return (
      <Alert className="border-green-500/50 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-sm font-medium text-green-700">Backend ready!</AlertTitle>
        <AlertDescription className="text-xs text-green-600">
          You can now log in quickly.
        </AlertDescription>
      </Alert>
    );
  }

  // Failed state
  if (state === 'failed') {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">Backend warmup timed out</AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <p>
            The backend is taking longer than expected to wake up. You can still try to log in, but it may take a moment.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 text-xs"
          >
            Retry Warmup
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
