import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Trash2, Loader2, AlertCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { clearSweetStepsSession } from '../utils/sessionReset';

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
    <header className="w-full border-b border-border bg-card">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoggingOut || isDeleting}
                  className="rounded-lg"
                  aria-label="Menu"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut || isDeleting}
                  className="cursor-pointer"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoggingOut || isDeleting}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
          </div>
        </div>
      </div>
    </header>
  );
}
