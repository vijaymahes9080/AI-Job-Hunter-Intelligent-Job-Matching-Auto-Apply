/**
 * inputSanitizer.ts
 * Strips HTML/script injection and limits string length before
 * including user input in API queries or rendering as HTML.
 */

/** Remove HTML tags, script payloads, and limit to maxLen chars */
export function sanitizeInput(value: string, maxLen = 200): string {
  return value
    .replace(/<[^>]*>/g, '')                 // strip HTML tags
    .replace(/javascript:/gi, '')            // block JS protocol
    .replace(/on\w+\s*=/gi, '')              // block inline event handlers
    .replace(/[<>"'`]/g, '')                 // strip risky chars
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim()
    .substring(0, maxLen);
}

/** Sanitize an entire object's string fields recursively */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      result[key] = sanitizeInput(val);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      result[key] = sanitizeObject(val);
    } else if (Array.isArray(val)) {
      result[key] = val.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else {
      result[key] = val;
    }
  }
  return result as T;
}
