const DISPLAY_NAME_PREFIX = 'sweetsteps_display_name_';
const SKIP_FLAG_PREFIX = 'sweetsteps_skip_display_name_';

/**
 * Hook for managing per-principal display names in localStorage
 */
export function useLocalDisplayName() {
  const getDisplayName = (principal: string): string | null => {
    try {
      const key = `${DISPLAY_NAME_PREFIX}${principal}`;
      return localStorage.getItem(key);
    } catch (err) {
      console.error('Error reading display name from localStorage:', err);
      return null;
    }
  };

  const setDisplayName = (principal: string, name: string): void => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Display name cannot be empty');
      }
      const key = `${DISPLAY_NAME_PREFIX}${principal}`;
      localStorage.setItem(key, trimmedName);
    } catch (err) {
      console.error('Error saving display name to localStorage:', err);
      throw err;
    }
  };

  const hasSkipped = (principal: string): boolean => {
    try {
      const key = `${SKIP_FLAG_PREFIX}${principal}`;
      return localStorage.getItem(key) === 'true';
    } catch (err) {
      console.error('Error reading skip flag from localStorage:', err);
      return false;
    }
  };

  const setSkipped = (principal: string): void => {
    try {
      const key = `${SKIP_FLAG_PREFIX}${principal}`;
      localStorage.setItem(key, 'true');
    } catch (err) {
      console.error('Error saving skip flag to localStorage:', err);
    }
  };

  const clearDisplayName = (principal: string): void => {
    try {
      const nameKey = `${DISPLAY_NAME_PREFIX}${principal}`;
      const skipKey = `${SKIP_FLAG_PREFIX}${principal}`;
      localStorage.removeItem(nameKey);
      localStorage.removeItem(skipKey);
    } catch (err) {
      console.error('Error clearing display name from localStorage:', err);
    }
  };

  return {
    getDisplayName,
    setDisplayName,
    hasSkipped,
    setSkipped,
    clearDisplayName,
  };
}
