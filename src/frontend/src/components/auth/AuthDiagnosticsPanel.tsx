import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Status } from '../../hooks/useInternetIdentity';
import type { Identity } from '@icp-sdk/core/agent';
import type { PlatformInfo } from '../../utils/platform';
import type { StalledAuthState } from '../../hooks/useStalledAuthDetection';

interface AuthDiagnosticsPanelProps {
  loginStatus: Status;
  isLoggingIn: boolean;
  isInitializing: boolean;
  identity: Identity | undefined;
  attemptPhase?: string;
  attemptElapsedMs?: number | null;
  platformInfo?: PlatformInfo;
  stalledState?: StalledAuthState;
}

/**
 * Enhanced diagnostics component that displays resolved Internet Identity provider URL,
 * current auth flags, platform detection, attempt timing, and stall detection details.
 * Only rendered when debugAuth=1 is present in the URL.
 */
export function AuthDiagnosticsPanel({
  loginStatus,
  isLoggingIn,
  isInitializing,
  identity,
  attemptPhase,
  attemptElapsedMs,
  platformInfo,
  stalledState,
}: AuthDiagnosticsPanelProps) {
  const iiUrl = (window as any).process?.env?.II_URL || 'https://identity.ic0.app';

  return (
    <Card className="border-muted bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono">Auth Diagnostics (debugAuth=1)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs font-mono">
        {/* Basic Auth State */}
        <div className="space-y-1">
          <div className="text-muted-foreground font-semibold">Auth State:</div>
          <div className="flex justify-between pl-2">
            <span className="text-muted-foreground">loginStatus:</span>
            <span className="text-foreground">{loginStatus}</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-muted-foreground">isLoggingIn:</span>
            <span className="text-foreground">{isLoggingIn ? 'true' : 'false'}</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-muted-foreground">isInitializing:</span>
            <span className="text-foreground">{isInitializing ? 'true' : 'false'}</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-muted-foreground">identity present:</span>
            <span className="text-foreground">{identity ? 'true' : 'false'}</span>
          </div>
          {attemptPhase && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">attemptPhase:</span>
              <span className="text-foreground">{attemptPhase}</span>
            </div>
          )}
        </div>

        {/* Attempt Timing */}
        {attemptElapsedMs !== undefined && (
          <div className="space-y-1">
            <div className="text-muted-foreground font-semibold">Attempt Timing:</div>
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">elapsed:</span>
              <span className="text-foreground">
                {attemptElapsedMs !== null ? `${attemptElapsedMs}ms` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* Stall Detection */}
        {stalledState && (
          <div className="space-y-1">
            <div className="text-muted-foreground font-semibold">Stall Detection:</div>
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">isStalled:</span>
              <span className="text-foreground">{stalledState.isStalled ? 'true' : 'false'}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">timeoutReached:</span>
              <span className="text-foreground">{stalledState.timeoutReached ? 'true' : 'false'}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">timeout config:</span>
              <span className="text-foreground">{stalledState.configuredTimeoutMs}ms</span>
            </div>
          </div>
        )}

        {/* Platform Detection */}
        {platformInfo && (
          <div className="space-y-1">
            <div className="text-muted-foreground font-semibold">Platform:</div>
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">isChromeAndroid:</span>
              <span className="text-foreground">{platformInfo.isChromeAndroid ? 'true' : 'false'}</span>
            </div>
            <div className="flex flex-col pl-2">
              <span className="text-muted-foreground">userAgent:</span>
              <span className="text-foreground break-all text-[10px] mt-1">
                {platformInfo.userAgent}
              </span>
            </div>
          </div>
        )}

        {/* II Configuration */}
        <div className="space-y-1">
          <div className="text-muted-foreground font-semibold">Configuration:</div>
          <div className="flex flex-col pl-2">
            <span className="text-muted-foreground">II URL:</span>
            <span className="text-foreground break-all text-[10px] mt-1">{iiUrl}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
