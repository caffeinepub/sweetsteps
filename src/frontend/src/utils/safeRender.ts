/**
 * Utilities to safely render AI-provided values that may be objects/arrays
 * instead of expected strings, preventing React crashes.
 */

/**
 * Convert unknown AI-provided value into a safe string for rendering
 */
export function toSafeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    // Join array elements with newlines
    return value.map(toSafeString).filter(Boolean).join('\n');
  }

  if (typeof value === 'object') {
    // Pretty-print object as JSON
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Object]';
    }
  }

  return String(value);
}

/**
 * Get a user-friendly fallback message when AI response is invalid
 */
export function getInvalidResponseFallback(): string {
  return 'Unable to display this content. The AI response was in an unexpected format. Please try generating your plan again.';
}

/**
 * Validate that a value is a non-empty string
 */
export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Safely extract a string field from an object, with fallback
 */
export function safeExtractString(
  obj: unknown,
  field: string,
  fallback: string = ''
): string {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }

  const value = (obj as Record<string, unknown>)[field];
  return isValidString(value) ? value : fallback;
}
