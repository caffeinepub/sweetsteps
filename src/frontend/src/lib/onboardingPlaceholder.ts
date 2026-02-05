// Storage key for persisted onboarding result
export const ONBOARDING_STORAGE_KEY = 'sweetsteps_onboarding_result';

// Safe JSON parse helper
export function safeParseJSON<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Safe JSON stringify helper
export function safeStringifyJSON<T>(data: T): string | null {
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}
