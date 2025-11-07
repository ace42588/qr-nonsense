# Test Suite

This directory contains comprehensive tests for the QR-Nonsense project. The tests are written using Vitest and React Testing Library.

## Test Structure

The test suite is organized to verify the desired outcomes for incomplete features and improvements:

### Type Safety Tests (`type-safety.test.ts`)
- Verifies that `createInput` returns proper `Input` type instead of `any`
- Verifies that `getECCodeword` accepts proper `Source` type
- Verifies that `QRState.inputs` uses `Input[]` instead of `any[]`
- Verifies that `Field` interface has specific properties

### ECI Encoder Tests (`eci-encoder.test.ts`)
- Tests for proper ECI (Extended Channel Interpretation) encoder implementation
- Verifies encoding of 1-3 digit ECI assignment numbers
- Tests validation and error handling
- Verifies correct bit length encoding based on ECI assignment number range

### Error Handling Tests (`error-handling.test.ts`)
- Tests for improved error handling in `encodeFieldsToBytes`
- Verifies error logging when field values are missing or out of range
- Tests for error boundaries (placeholder for future implementation)
- Tests for scanner error handling improvements

### Codeword Color Coding Tests (`codeword-color-coding.test.ts`)
- Tests for color coding of non-data codewords
- Verifies that different codeword types get distinct visual representation
- Tests for `getButtonClass` function implementation

### Format Info Placeholder Tests (`format-info-placeholder.test.ts`)
- Tests for proper handling of format info when mask is -1 (auto)
- Verifies placeholder value behavior
- Tests for proper format info placement after mask selection

### BitField Utils Tests (`bitfield-utils.test.ts`)
- Tests for error handling and logging in `encodeFieldsToBytes`
- Tests for `generateBitLayout` function
- Tests for `generateBitLayoutFromSchema` function
- Verifies proper error messages and logging

### Codeword Utils Tests (`codeword-utils.test.ts`)
- Tests for `getCodeword` function
- Tests for `getECCodeword` with proper Source type
- Tests for `getCodewordsFromSegments` function
- Tests for `interleave` function

### Input Factory Tests (`input-factory.test.ts`)
- Tests for `createInput` return type
- Tests for all input type defaults
- Verifies proper Input type structure

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Philosophy

These tests follow a Test-Driven Development (TDD) approach:

1. **Tests are written first** to define the desired behavior
2. **Tests may initially fail** until the features are properly implemented
3. **Tests serve as documentation** of expected functionality
4. **Tests verify type safety** improvements before code changes

## Notes

- Some tests include TODO comments indicating features that need to be implemented
- Tests use mocks for `crypto.randomUUID` to ensure consistent test IDs
- Console.debug is suppressed in tests unless explicitly needed
- Tests use Vitest's globals mode for cleaner test syntax

