import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock crypto.randomUUID for consistent test IDs
let uuidCounter = 0;
const mockRandomUUID = () => `test-uuid-${uuidCounter++}`;

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

// Suppress console.debug in tests unless explicitly needed
const originalDebug = console.debug;
beforeAll(() => {
  console.debug = vi.fn();
});

afterAll(() => {
  console.debug = originalDebug;
});

