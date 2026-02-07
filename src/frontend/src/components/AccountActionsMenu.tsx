import { useState } from 'react';
import { Menu, LogOut, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AccountActionsMenuProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
  isLoggingOut: boolean;
  isDeleting: boolean;
}

export function AccountActionsMenu({
  onLogout,
  onDeleteAccount,
  isLoggingOut,
  isDeleting,
}: AccountActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const isDisabled = isLoggingOut || isDeleting;

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  const handleDeleteAccount = () => {
    setOpen(false);
    onDeleteAccount();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="rounded-lg"
          aria-label="Account actions menu"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isDisabled}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDeleteAccount}
          disabled={isDisabled}
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
  );
}
