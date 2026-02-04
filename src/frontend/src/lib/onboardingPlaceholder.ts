interface WeeklyMountain {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface OnboardingPlanResult {
  bigGoal: string;
  sampleWeeklyMountain: WeeklyMountain;
  sampleDailyStep: string;
}

/**
 * Generates placeholder onboarding plan data locally without making any network calls.
 * This will be replaced with real API integration later.
 */
export function generatePlaceholderPlan(
  goal: string,
  currentStanding: string,
  timeframe: string
): OnboardingPlanResult {
  // Generate contextual placeholder data based on inputs
  const bigGoal = `Master ${goal} within ${timeframe} by building consistent habits and celebrating small wins along the way.`;
  
  const sampleWeeklyMountain: WeeklyMountain = {
    name: `Week 1: Foundation for ${goal}`,
    weeklyTarget: `Establish your baseline and create a sustainable routine for ${goal}`,
    note: `Starting from "${currentStanding}", focus on showing up consistently rather than perfection. Small steps compound into remarkable progress.`
  };
  
  const sampleDailyStep = `Spend 15 minutes on ${goal} today. Set a timer, eliminate distractions, and focus on one small action that moves you forward.`;

  return {
    bigGoal,
    sampleWeeklyMountain,
    sampleDailyStep
  };
}
