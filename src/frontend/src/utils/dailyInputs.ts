/**
 * Utility to derive Daily AI generation inputs from multiple sources.
 * Prefers onboarding context values, falls back to backend profile + cached weekly mountain.
 */

interface WeeklyMountain {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface DailyInputs {
  bigGoal: string;
  weeklyMountain: WeeklyMountain;
}

interface DailyInputsResult {
  success: boolean;
  inputs?: DailyInputs;
  source?: 'onboarding' | 'backend-cache' | 'none';
}

/**
 * Attempts to derive valid Daily AI inputs from available sources.
 * Priority: onboarding context > backend profile + cached weekly mountain
 */
export function deriveDailyInputs(
  onboardingBigGoal: string | undefined,
  onboardingWeeklyMountain: WeeklyMountain | undefined,
  backendProfileGoal: string | undefined
): DailyInputsResult {
  // First priority: onboarding context has both values
  if (onboardingBigGoal && onboardingWeeklyMountain) {
    return {
      success: true,
      inputs: {
        bigGoal: onboardingBigGoal,
        weeklyMountain: onboardingWeeklyMountain,
      },
      source: 'onboarding',
    };
  }

  // Second priority: backend profile goal + cached weekly mountain
  if (backendProfileGoal) {
    const cachedMountainRaw = localStorage.getItem('sweetsteps_weekly_mountain');
    if (cachedMountainRaw) {
      try {
        const cachedMountain = JSON.parse(cachedMountainRaw);
        // Validate the cached mountain has required fields
        if (
          cachedMountain &&
          typeof cachedMountain.name === 'string' &&
          typeof cachedMountain.weeklyTarget === 'string' &&
          typeof cachedMountain.note === 'string'
        ) {
          return {
            success: true,
            inputs: {
              bigGoal: backendProfileGoal,
              weeklyMountain: cachedMountain,
            },
            source: 'backend-cache',
          };
        }
      } catch (err) {
        console.error('[deriveDailyInputs] Failed to parse cached weekly mountain:', err);
      }
    }
  }

  // No valid inputs available
  return {
    success: false,
    source: 'none',
  };
}
