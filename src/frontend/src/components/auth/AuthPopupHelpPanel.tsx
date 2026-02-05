import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface AuthPopupHelpPanelProps {
  onRetry: () => void;
}

/**
 * Reusable inline help panel that explains Internet Identity opens a new window,
 * includes 'Allow popups' guidance, provides a Retry action, and renders a visible
 * link to the configured Internet Identity URL.
 * 
 * Enhanced with mobile-specific guidance for Chrome Android users.
 */
export function AuthPopupHelpPanel({ onRetry }: AuthPopupHelpPanelProps) {
  const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';

  return (
    <Alert className="border-warning bg-warning/10">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="space-y-3">
        <div className="text-sm">
          <p className="font-semibold mb-2">Internet Identity window didn't open?</p>
          <p className="mb-2">
            Internet Identity opens in a new window. If you don't see it, your browser may be blocking popups or redirects.
          </p>
          <p className="text-muted-foreground text-xs mb-2">
            <strong>Next steps:</strong>
          </p>
          <ul className="text-muted-foreground text-xs list-disc list-inside space-y-1">
            <li>Allow popups for this site in your browser settings</li>
            <li>Try the Retry button below</li>
            <li>Or use the direct link to open Internet Identity manually</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Retry
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
          >
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
      </AlertDescription>
    </Alert>
  );
}
