import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import type { AuthFlowState } from '../../hooks/useAuthFlowDiagnostics';

interface AuthStatusBannerProps {
  flowState: AuthFlowState;
  onRetry?: () => void;
}

/**
 * Always-visible authentication status banner that shows:
 * - Current step with plain-English label
 * - Elapsed time
 * - Terminal outcomes (success/error/stalled)
 * - Suggested actions with retry and direct II link
 */
export function AuthStatusBanner({ flowState, onRetry }: AuthStatusBannerProps) {
  const { currentStep, stepLabel, elapsedMs, outcome, outcomeMessage, slowStep, correlationId } = flowState;

  // Don't show banner when idle
  if (currentStep === 'idle' || !correlationId) {
    return null;
  }

  const isTerminal = outcome !== null;
  const isSuccess = outcome === 'success';
  const isError = outcome === 'error';
  const isStalled = outcome === 'stalled';

  const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';

  // Determine variant
  const variant = isError || isStalled ? 'destructive' : 'default';

  // Format elapsed time
  const formatElapsed = (ms: number | null): string => {
    if (ms === null) return '0s';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get icon
  const getIcon = () => {
    if (isSuccess) return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (isError || isStalled) return <AlertCircle className="h-4 w-4" />;
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  // Get suggested action text
  const getSuggestedAction = (): string | null => {
    if (isStalled) {
      return 'The authentication window may be blocked. Try the Retry button or use the direct link below.';
    }
    if (isError && outcomeMessage) {
      return outcomeMessage;
    }
    if (slowStep) {
      return `${stepLabel} is taking longer than expected. Please wait...`;
    }
    return null;
  };

  const suggestedAction = getSuggestedAction();

  return (
    <Alert variant={variant} className="border-2">
      {getIcon()}
      <AlertDescription className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{stepLabel}</span>
            {!isTerminal && elapsedMs !== null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatElapsed(elapsedMs)}
              </span>
            )}
          </div>
          {isTerminal && elapsedMs !== null && (
            <span className="text-xs text-muted-foreground">
              Total: {formatElapsed(elapsedMs)}
            </span>
          )}
        </div>

        {suggestedAction && (
          <p className="text-xs text-muted-foreground">{suggestedAction}</p>
        )}

        {(isError || isStalled) && onRetry && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button onClick={onRetry} variant="outline" size="sm" className="w-full sm:w-auto">
              Retry
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
              <a
                href={iiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1"
              >
                Open Internet Identity
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}

        {correlationId && (
          <p className="text-[10px] text-muted-foreground/60 font-mono pt-1">
            ID: {correlationId}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
