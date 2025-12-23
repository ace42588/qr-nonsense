/**
 * Generate a unique identifier using crypto.randomUUID()
 * Centralized utility to avoid duplication across the codebase.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

