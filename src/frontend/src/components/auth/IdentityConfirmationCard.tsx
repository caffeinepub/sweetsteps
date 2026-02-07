import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, RefreshCw } from 'lucide-react';
import { useLocalDisplayName } from '../../hooks/useLocalDisplayName';

interface IdentityConfirmationCardProps {
  principal: string;
  onContinue: () => void;
  onSwitchIdentity: () => void;
  isLoading?: boolean;
  title: string;
  description: string;
}

export function IdentityConfirmationCard({
  principal,
  onContinue,
  onSwitchIdentity,
  isLoading = false,
  title,
  description,
}: IdentityConfirmationCardProps) {
  const { getDisplayName } = useLocalDisplayName();
  
  // Get display name for this principal
  const displayName = getDisplayName(principal);
  
  // Truncate principal for display (show first 10 and last 6 characters)
  const displayPrincipal = principal.length > 20 
    ? `${principal.slice(0, 10)}...${principal.slice(-6)}`
    : principal;

  return (
    <Card className="border-2 border-primary/20 bg-card/50">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-xl font-semibold text-card-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
          {displayName && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Display Name</p>
              <p className="text-base font-semibold text-foreground">
                {displayName}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {displayName ? 'Principal ID' : 'Current Identity'}
            </p>
            <p className="text-sm font-mono text-foreground/80 break-all" title={principal}>
              {displayPrincipal}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <Button
            size="lg"
            className="w-full text-base font-semibold h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Continue with this identity'
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full text-base font-semibold h-11 rounded-xl"
            onClick={onSwitchIdentity}
            disabled={isLoading}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Use a different Internet Identity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
