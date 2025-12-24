/**
 * Generate a unique identifier using crypto.randomUUID()
 * Centralized utility to avoid duplication across the codebase.
 * Uses Web Crypto API which is available in modern browsers.
 */
export function generateId(): string {
  // Use Web Crypto API - works in both Node.js and browsers
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for Node.js or older browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate a simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

