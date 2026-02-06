/**
 * Session Reset Utility
 * Clears all SweetSteps client-side persisted state
 */

import { ONBOARDING_STORAGE_KEY } from '../lib/onboardingPlaceholder';

const WEEKLY_MOUNTAIN_CACHE_KEY = 'sweetsteps_weekly_mountain_cache';
const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';

/**
 * Clear all SweetSteps persisted state from localStorage
 * Call this on logout or account deletion
 */
export function clearSweetStepsSession(): void {
  console.log('[SessionReset] Clearing all persisted state');
  
  // Clear onboarding result
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  
  // Clear weekly mountain cache
  localStorage.removeItem(WEEKLY_MOUNTAIN_CACHE_KEY);
  
  // Clear Sweet Summit seen flag
  localStorage.removeItem(SWEET_SUMMIT_SEEN_KEY);
  
  console.log('[SessionReset] All persisted state cleared');
}
