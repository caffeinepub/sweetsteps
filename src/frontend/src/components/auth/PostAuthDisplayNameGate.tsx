import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useLocalDisplayName } from '../../hooks/useLocalDisplayName';
import { DisplayNamePromptDialog } from './DisplayNamePromptDialog';
import { hasNewAccountFlag, clearNewAccountFlag } from '../../utils/sessionFlags';

export function PostAuthDisplayNameGate() {
  const { identity, isInitializing } = useInternetIdentity();
  const { getDisplayName, setDisplayName, hasSkipped, setSkipped } = useLocalDisplayName();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isInitializing || !identity) {
      setShowPrompt(false);
      return;
    }

    // Only show prompt for authenticated (non-anonymous) identities
    if (identity.getPrincipal().isAnonymous()) {
      setShowPrompt(false);
      return;
    }

    const principal = identity.getPrincipal().toString();
    const existingName = getDisplayName(principal);
    const skipped = hasSkipped(principal);

    // Check if this is a new-account flow
    const isNewAccount = hasNewAccountFlag();

    // Show prompt if:
    // 1. This is a new-account flow (session flag is set)
    // 2. No name exists
    // 3. User hasn't skipped
    if (isNewAccount && !existingName && !skipped) {
      console.log('[PostAuthDisplayNameGate] Showing display name prompt for new account');
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
      // Clear the flag if conditions don't match (defensive cleanup)
      if (isNewAccount && (existingName || skipped)) {
        clearNewAccountFlag();
      }
    }
  }, [identity, isInitializing, getDisplayName, hasSkipped]);

  const handleSave = (name: string) => {
    if (!identity) return;
    const principal = identity.getPrincipal().toString();
    setDisplayName(principal, name);
    setShowPrompt(false);
    // Clear the new-account flag after save
    clearNewAccountFlag();
    console.log('[PostAuthDisplayNameGate] Display name saved, navigating to onboarding');
    // Navigate to onboarding after display name is set
    navigate({ to: '/onboarding' });
  };

  const handleSkip = () => {
    if (!identity) return;
    const principal = identity.getPrincipal().toString();
    setSkipped(principal);
    setShowPrompt(false);
    // Clear the new-account flag after skip
    clearNewAccountFlag();
    console.log('[PostAuthDisplayNameGate] Display name skipped, navigating to onboarding');
    // Navigate to onboarding after skip
    navigate({ to: '/onboarding' });
  };

  return (
    <DisplayNamePromptDialog
      open={showPrompt}
      onSave={handleSave}
      onSkip={handleSkip}
    />
  );
}
