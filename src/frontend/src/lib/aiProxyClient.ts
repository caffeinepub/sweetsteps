// AI Proxy Client - Calls external proxy API endpoints only
// DO NOT call Groq directly from the frontend

// ===============================
// TYPE DEFINITIONS
// ===============================

interface OnboardingPlanRequest {
  vagueGoal: string;
  currentProgress: string;
  timeLimit: string;
}

interface WeeklyMountain {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface OnboardingPlanResponse {
  bigGoal: string;
  weeklyMountain: WeeklyMountain;
  dailyStep: string;
}

interface WeeklyMountainRequest {
  bigGoal: string;
}

interface WeeklyMountainResponse {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface DailyTask {
  title: string;
  description: string;
  estimatedMinutes: number;
}

interface DailyStepsRequest {
  bigGoal: string;
  weeklyMountain: WeeklyMountain;
}

interface DailyStepsResponse {
  tasks: DailyTask[];
}

// ===============================
// ERROR TYPES
// ===============================

export class AIProxyError extends Error {
  constructor(
    message: string,
    public readonly isNetworkError: boolean = false,
    public readonly isParseError: boolean = false
  ) {
    super(message);
    this.name = 'AIProxyError';
  }
}

// ===============================
// VALIDATION HELPERS
// ===============================

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateWeeklyMountain(data: unknown): WeeklyMountain {
  if (!data || typeof data !== 'object') {
    throw new AIProxyError(
      'Invalid AI response: weekly mountain data is missing or malformed. Please try again.',
      false,
      false
    );
  }

  const obj = data as Record<string, unknown>;

  if (!isValidString(obj.name) || !isValidString(obj.weeklyTarget) || !isValidString(obj.note)) {
    throw new AIProxyError(
      'Invalid AI response: weekly mountain fields are incomplete. Please try again.',
      false,
      false
    );
  }

  return {
    name: obj.name,
    weeklyTarget: obj.weeklyTarget,
    note: obj.note,
  };
}

function validateOnboardingPlanResponse(data: unknown): OnboardingPlanResponse {
  if (!data || typeof data !== 'object') {
    throw new AIProxyError(
      'Invalid AI response: response data is missing or malformed. Please try again.',
      false,
      false
    );
  }

  const obj = data as Record<string, unknown>;

  if (!isValidString(obj.bigGoal) || !isValidString(obj.dailyStep)) {
    throw new AIProxyError(
      'Invalid AI response: required fields are incomplete. Please try again.',
      false,
      false
    );
  }

  const weeklyMountain = validateWeeklyMountain(obj.weeklyMountain);

  return {
    bigGoal: obj.bigGoal,
    weeklyMountain,
    dailyStep: obj.dailyStep,
  };
}

// ===============================
// PROXY ENDPOINTS
// ===============================

const PROXY_BASE_URL = 'https://sweetsteps-ai.onrender.com';

const ENDPOINTS = {
  ONBOARDING_PLAN: `${PROXY_BASE_URL}/onboarding-plan`,
  WEEKLY_MOUNTAIN: `${PROXY_BASE_URL}/weekly-mountain`,
  DAILY_STEPS: `${PROXY_BASE_URL}/daily-steps`,
} as const;

// ===============================
// SHARED FETCH LOGIC
// ===============================

async function proxyFetch<TRequest, TResponse>(
  endpoint: string,
  body: TRequest,
  validator?: (data: unknown) => TResponse
): Promise<TResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Special handling for cold-start related status codes
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new AIProxyError(
          'Unable to reach AI right now. The AI service may be waking up (hosted on Render free tier). This can take up to 60 seconds. Please wait a moment and try again.',
          false,
          false
        );
      }
      
      // Generic error for other non-2xx responses
      throw new AIProxyError(
        'Unable to reach AI right now. The service may be temporarily unavailable. Please try again in a moment.',
        false,
        false
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new AIProxyError(
        'Unable to reach AI right now. Try again. The AI service may be waking up (hosted on Render free tier). This can take up to 60 seconds. Please wait a moment and retry.',
        false,
        true
      );
    }

    // Validate response if validator provided
    if (validator) {
      return validator(data);
    }

    return data as TResponse;
  } catch (error: any) {
    // Re-throw AIProxyError as-is
    if (error instanceof AIProxyError) {
      throw error;
    }

    // Network/fetch errors
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new AIProxyError(
        'Unable to reach AI right now. Try again. The AI service may be waking up (hosted on Render free tier). This can take up to 60 seconds. Please wait a moment and retry.',
        true,
        false
      );
    }

    // Unknown errors
    throw new AIProxyError(
      'Unable to reach AI right now. Try again. An unexpected error occurred. Please retry in a moment.',
      false,
      false
    );
  }
}

// ===============================
// PUBLIC API FUNCTIONS
// ===============================

/**
 * Generate onboarding plan (big goal, weekly mountain, daily step)
 * Use this only during onboarding after the 3 questions.
 */
export async function generateOnboardingPlan(
  vagueGoal: string,
  currentProgress: string,
  timeLimit: string
): Promise<OnboardingPlanResponse> {
  const request: OnboardingPlanRequest = {
    vagueGoal,
    currentProgress,
    timeLimit,
  };

  return proxyFetch<OnboardingPlanRequest, OnboardingPlanResponse>(
    ENDPOINTS.ONBOARDING_PLAN,
    request,
    validateOnboardingPlanResponse
  );
}

/**
 * Generate weekly mountain
 * Use this when the user finishes onboarding OR when a new week starts.
 */
export async function generateWeeklyMountain(
  bigGoal: string
): Promise<WeeklyMountainResponse> {
  const request: WeeklyMountainRequest = {
    bigGoal,
  };

  return proxyFetch<WeeklyMountainRequest, WeeklyMountainResponse>(
    ENDPOINTS.WEEKLY_MOUNTAIN,
    request,
    validateWeeklyMountain
  );
}

/**
 * Generate daily SweetSteps
 * Use this every morning or when the user opens the Daily SweetSteps page.
 * DO NOT use this during onboarding.
 */
export async function generateDailySteps(
  bigGoal: string,
  weeklyMountain: WeeklyMountain
): Promise<DailyStepsResponse> {
  const request: DailyStepsRequest = {
    bigGoal,
    weeklyMountain,
  };

  return proxyFetch<DailyStepsRequest, DailyStepsResponse>(
    ENDPOINTS.DAILY_STEPS,
    request
  );
}

// Export types for use in components
export type {
  OnboardingPlanResponse,
  WeeklyMountain,
  WeeklyMountainResponse,
  DailyTask,
  DailyStepsResponse,
};
