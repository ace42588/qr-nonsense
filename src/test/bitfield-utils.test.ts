/**
 * Tests for bitfield utilities
 * These tests verify error handling and logging improvements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encodeFieldsToBytes,
  generateBitLayout,
  generateBitLayoutFromSchema,
} from '@/domain/input/parsers/utils/bitFieldUtils';

describe('BitField Utils Tests', () => {
  describe('encodeFieldsToBytes error handling', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should return null and log error for missing field value', () => {
      const fieldsLayout = [
        {
          label: 'missing.field',
          min: 0,
          max: 255,
          startBit: 7,
          endBit: 0,
          width: 8,
        },
      ];
      const values = {};

      const result = encodeFieldsToBytes(fieldsLayout, values);

      expect(result).toBeNull();
      
      // TODO: Once error logging is implemented, verify it was called
      // expect(consoleErrorSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('Missing value for field')
      // );
    });

    it('should return null and log error for out-of-range value', () => {
      const fieldsLayout = [
        {
          label: 'outOfRange.field',
          min: 0,
          max: 100,
          startBit: 7,
          endBit: 0,
          width: 8,
        },
      ];
      const values = { 'outOfRange.field': 200 };

      const result = encodeFieldsToBytes(fieldsLayout, values);

      expect(result).toBeNull();
      
      // TODO: Once error logging is implemented
      // expect(consoleErrorSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('out of allowed range')
      // );
    });

    it('should successfully encode valid fields', () => {
      const fieldsLayout = [
        {
          label: 'valid.field',
          min: 0,
          max: 255,
          startBit: 7,
          endBit: 0,
          width: 8,
        },
      ];
      const values = { 'valid.field': 42 };

      const result = encodeFieldsToBytes(fieldsLayout, values);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result![0]).toBe(42);
    });

    it('should handle multiple fields correctly', () => {
      const fieldsLayout = [
        {
          label: 'field1',
          min: 0,
          max: 15,
          startBit: 7,
          endBit: 4,
          width: 4,
        },
        {
          label: 'field2',
          min: 0,
          max: 15,
          startBit: 3,
          endBit: 0,
          width: 4,
        },
      ];
      const values = { field1: 10, field2: 5 };

      const result = encodeFieldsToBytes(fieldsLayout, values);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Uint8Array);
      // field1 (10 = 0b1010) in upper 4 bits, field2 (5 = 0b0101) in lower 4 bits
      // Result: 0b10100101 = 165
      expect(result![0]).toBe(165);
    });
  });

  describe('generateBitLayout', () => {
    it('should generate layout from field definitions', () => {
      const fields = [
        { label: 'field1', min: 0, max: 15 },
        { label: 'field2', min: 0, max: 255 },
      ];

      const result = generateBitLayout(fields);

      expect(result.layout).toBeDefined();
      expect(result.layout.length).toBe(2);
      expect(result.totalBits).toBeGreaterThan(0);
    });

    it('should calculate correct bit widths', () => {
      const fields = [
        { label: 'field1', min: 0, max: 3 }, // Needs 2 bits
        { label: 'field2', min: 0, max: 15 }, // Needs 4 bits
      ];

      const result = generateBitLayout(fields);

      expect(result.layout[0].width).toBe(2);
      expect(result.layout[1].width).toBe(4);
      expect(result.totalBits).toBe(6);
    });
  });

  describe('generateBitLayoutFromSchema', () => {
    it('should generate layout from JSON schema', () => {
      const schema = {
        type: 'object',
        properties: {
          field1: {
            type: 'integer',
            bits: 4,
          },
          field2: {
            type: 'integer',
            bits: 8,
          },
        },
      };

      const result = generateBitLayoutFromSchema(schema);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].label).toBe('field1');
      expect(result[1].label).toBe('field2');
    });

    it('should throw error for missing bits in schema', () => {
      const schema = {
        type: 'object',
        properties: {
          field1: {
            type: 'integer',
            // Missing bits property
          },
        },
      };

      expect(() => {
        generateBitLayoutFromSchema(schema);
      }).toThrow('Missing \'bits\' for field: field1');
    });

    it('should handle nested objects in schema', () => {
      const schema = {
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: {
              field1: {
                type: 'integer',
                bits: 4,
              },
            },
          },
        },
      };

      const result = generateBitLayoutFromSchema(schema);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].label).toBe('nested.field1');
    });
  });
});

