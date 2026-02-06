/**
 * Session-scoped flags for tracking transient auth flow state.
 * These flags are cleared when the browser tab/window is closed.
 */

const NEW_ACCOUNT_FLAG_KEY = 'sweetsteps:new-account-flow';

/**
 * Mark that the current session is a new-account signup flow.
 * This flag is used to determine if the display-name dialog should appear.
 */
export function setNewAccountFlag(): void {
  try {
    sessionStorage.setItem(NEW_ACCOUNT_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('Failed to set new-account flag:', err);
  }
}

/**
 * Check if the current session is marked as a new-account flow.
 */
export function hasNewAccountFlag(): boolean {
  try {
    return sessionStorage.getItem(NEW_ACCOUNT_FLAG_KEY) === 'true';
  } catch (err) {
    console.warn('Failed to read new-account flag:', err);
    return false;
  }
}

/**
 * Clear the new-account flag from session storage.
 */
export function clearNewAccountFlag(): void {
  try {
    sessionStorage.removeItem(NEW_ACCOUNT_FLAG_KEY);
  } catch (err) {
    console.warn('Failed to clear new-account flag:', err);
  }
}
