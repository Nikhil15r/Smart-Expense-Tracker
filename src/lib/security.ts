/**
 * Security controls: CSV formula injection defense, rate limiting, and tenant scoping.
 */

// Simple in-memory token bucket rate limiter for sensitive operations (login, registration, sync)
const rateLimitBuckets: Map<string, { count: number; resetTime: number }> = new Map();

/**
 * Checks if a client identifier (IP or user ID) has exceeded rate limits.
 * @param key unique identifier (e.g. `auth:${ip}`)
 * @param limit max requests allowed in window
 * @param windowMs window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number = 10, windowMs: number = 60000): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetTime) {
    rateLimitBuckets.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: bucket.resetTime };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetTime: bucket.resetTime };
}

/**
 * Sanitizes cell values to prevent CSV / Excel formula injection (CWE-1236).
 * Any value starting with `=`, `+`, `-`, `@`, tab, or carriage return is prefixed with a single quote.
 */
export function sanitizeForSpreadsheet(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();

  // If starts with risky formula trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Validates that an object belongs to the authenticated user.
 * Throws an explicit 403 Forbidden error if user IDs do not match.
 */
export function assertUserOwnership(resourceUserId: string, authenticatedUserId: string, resourceName: string = 'Resource'): void {
  if (!resourceUserId || !authenticatedUserId || resourceUserId !== authenticatedUserId) {
    const error = new Error(`Forbidden: You do not have permission to access or modify this ${resourceName}.`);
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Redacts sensitive tokens, account numbers, and passwords from log strings.
 */
export function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'cvv', 'pin', 'otp'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
