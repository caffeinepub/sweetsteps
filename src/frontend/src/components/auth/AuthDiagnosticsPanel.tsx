import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Status } from '../../hooks/useInternetIdentity';
import type { Identity } from '@icp-sdk/core/agent';

interface AuthDiagnosticsPanelProps {
  loginStatus: Status;
  isLoggingIn: boolean;
  isInitializing: boolean;
  identity: Identity | undefined;
}

/**
 * Minimal diagnostics component that renders only when enabled,
 * displaying resolved Internet Identity provider URL and current auth flags.
 */
export function AuthDiagnosticsPanel({
  loginStatus,
  isLoggingIn,
  isInitializing,
  identity,
}: AuthDiagnosticsPanelProps) {
  const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';

  return (
    <Card className="border-muted bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono">Auth Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-muted-foreground">II URL:</span>
          <span className="text-foreground break-all text-right ml-2">{iiUrl}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">loginStatus:</span>
          <span className="text-foreground">{loginStatus}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">isLoggingIn:</span>
          <span className="text-foreground">{isLoggingIn ? 'true' : 'false'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">isInitializing:</span>
          <span className="text-foreground">{isInitializing ? 'true' : 'false'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">identity present:</span>
          <span className="text-foreground">{identity ? 'true' : 'false'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
