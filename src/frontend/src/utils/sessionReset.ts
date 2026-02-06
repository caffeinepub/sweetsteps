/**
 * Session reset utility that clears all SweetSteps client-side persisted state.
 * This includes onboarding results and weekly mountain cache.
 */

const ONBOARDING_STORAGE_KEY = 'sweetsteps_onboarding_result';
const WEEKLY_CACHE_KEYS = ['sweetsteps_current_week', 'sweetsteps_weekly_mountain'];

/**
 * Clears all SweetSteps persisted client state from localStorage.
 * Call this when logging out or deleting account to ensure a clean slate.
 */
export function clearSweetStepsSession(): void {
  console.log('[SessionReset] Clearing all SweetSteps persisted state...');
  
  // Clear onboarding result
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  console.log('[SessionReset] Cleared onboarding result');
  
  // Clear weekly mountain cache
  WEEKLY_CACHE_KEYS.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[SessionReset] Cleared ${key}`);
  });
  
  console.log('[SessionReset] Session reset complete');
}
