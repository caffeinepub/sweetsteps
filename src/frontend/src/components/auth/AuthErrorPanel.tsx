import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface AuthErrorPanelProps {
  message: string;
  onRetry?: () => void;
  onReturnToLanding?: () => void;
}

/**
 * Reusable error panel component that shows a user-friendly error message,
 * includes 'Retry' and 'Return to Landing' actions, and can be used for
 * onboarding check failures as well as unexpected exceptions.
 */
export function AuthErrorPanel({ message, onRetry, onReturnToLanding }: AuthErrorPanelProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <p className="text-sm">{message}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto bg-background hover:bg-background/90"
            >
              Retry
            </Button>
          )}
          {onReturnToLanding && (
            <Button
              onClick={onReturnToLanding}
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
            >
              Return to Landing
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
