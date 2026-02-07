import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { clearSweetStepsSession } from '../utils/sessionReset';
import { AccountActionsMenu } from './AccountActionsMenu';

interface AuthenticatedHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AuthenticatedHeader({ title, subtitle }: AuthenticatedHeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clear: clearIdentity } = useInternetIdentity();
  const { actor } = useActor();
  const { clearOnboardingResult } = useOnboardingResult();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear Internet Identity session
      await clearIdentity();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Clear onboarding result from context
      clearOnboardingResult();
      
      // Clear all SweetSteps persisted state
      clearSweetStepsSession();
      
      // Navigate to landing
      navigate({ to: '/' });
    } catch (error) {
      console.error('[AuthenticatedHeader] Logout error:', error);
      // Even if there's an error, try to navigate away
      navigate({ to: '/' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteAccount = async () => {
    if (!actor) {
      setDeleteError('Unable to delete account: Not authenticated');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Call backend to delete user data
      await actor.deleteCallerUserData();
      
      // Clear Internet Identity session
      await clearIdentity();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Clear onboarding result from context
      clearOnboardingResult();
      
      // Clear all SweetSteps persisted state
      clearSweetStepsSession();
      
      // Navigate to landing
      navigate({ to: '/' });
    } catch (error: any) {
      console.error('[AuthenticatedHeader] Delete account error:', error);
      setDeleteError(
        error.message || 'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            
            <AccountActionsMenu
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccountClick}
              isLoggingOut={isLoggingOut}
              isDeleting={isDeleting}
            />
          </div>
        </div>
      </header>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This will permanently remove all your
              data from SweetSteps, including your profile, progress, and goals. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
