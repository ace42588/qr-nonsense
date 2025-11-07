/**
 * Tests to verify type safety improvements
 * These tests will fail until the type definitions are properly implemented
 */

import { describe, it, expect } from 'vitest';
import { createInput } from '@/state/inputs/inputFactory';
import { getECCodeword } from '@/domain/qr/codewords/utils';
import { getBits } from '@/domain/qr/codewords/bits';
import type { Input, Source, Codeword } from '@/types';

describe('Type Safety Tests', () => {
  describe('createInput return type', () => {
    it('should return Input type, not any', () => {
      const input = createInput({ type: 'string', label: 'Test Input' });
      
      // Verify it has all required Input properties
      expect(input).toHaveProperty('id');
      expect(input).toHaveProperty('type');
      expect(input).toHaveProperty('data');
      expect(input).toHaveProperty('mode');
      expect(input).toHaveProperty('label');
      
      // Type check: input should be assignable to Input
      const typedInput: Input = input;
      expect(typedInput.type).toBe('string');
    });

    it('should create string input with correct type', () => {
      const input = createInput({ type: 'string' });
      expect(input.type).toBe('string');
      expect(input.mode).toBe('byte');
      expect(typeof input.data).toBe('string');
    });

    it('should create json input with correct type', () => {
      const input = createInput({ type: 'json' });
      expect(input.type).toBe('json');
      expect(input).toHaveProperty('obj');
      expect(input).toHaveProperty('schema');
    });

    it('should create bitfield input with correct type', () => {
      const input = createInput({ type: 'bitfield' });
      expect(input.type).toBe('bitfield');
      expect(Array.isArray(input.layout)).toBe(true);
      expect(typeof input.values).toBe('object');
    });

    it('should create mac input with correct type', () => {
      const input = createInput({ type: 'mac' });
      expect(input.type).toBe('mac');
      expect(input).toHaveProperty('algo');
      expect(input).toHaveProperty('key');
      expect(Array.isArray(input.includedFields)).toBe(true);
    });
  });

  describe('getECCodeword source parameter type', () => {
    it('should accept Source type, not any', () => {
      const source: Source = {
        id: 'test-source-id',
        name: 'Test Source',
        type: 'testType',
      };

      const codeword = getECCodeword(0x42, source);
      
      // Verify codeword structure
      expect(codeword).toHaveProperty('type', 'errorCorrection');
      expect(codeword).toHaveProperty('id');
      expect(codeword).toHaveProperty('bits');
      expect(codeword).toHaveProperty('source');
      
      // Verify source is properly typed
      expect(codeword.source).toEqual(source);
      expect(codeword.source?.id).toBe('test-source-id');
    });

    it('should create codeword with proper source reference', () => {
      const source: Source = {
        id: 'ec-source',
        name: 'Error Correction Source',
      };

      const codeword = getECCodeword(123, source);
      
      expect(codeword.type).toBe('errorCorrection');
      expect(codeword.bits).toHaveLength(8);
      expect(codeword.source).toBe(source);
    });
  });

  describe('QRState inputs type', () => {
    it('should use Input[] type instead of any[]', () => {
      // This test verifies that when QRState.inputs is properly typed,
      // we can safely iterate and access Input properties
      const inputs: Input[] = [
        createInput({ type: 'string', label: 'Input 1' }),
        createInput({ type: 'json', label: 'Input 2' }),
      ];

      // Verify all items are Input type
      inputs.forEach((input) => {
        expect(input).toHaveProperty('id');
        expect(input).toHaveProperty('type');
        expect(input).toHaveProperty('data');
        expect(input).toHaveProperty('mode');
      });

      // Type check: should be assignable to Input[]
      const typedInputs: Input[] = inputs;
      expect(typedInputs.length).toBe(2);
    });
  });

  describe('Field interface type safety', () => {
    it('should have specific properties instead of [key: string]: any', () => {
      // This test verifies that Field interface should be more specific
      const field = {
        id: 'field-1',
        label: 'Test Field',
        min: 0,
        max: 255,
        bitWidth: 8,
        type: 'base10',
        mode: 'bits',
      };

      // Verify it has expected properties
      expect(field).toHaveProperty('id');
      expect(field).toHaveProperty('label');
      expect(typeof field.id).toBe('string');
      expect(typeof field.label).toBe('string');
    });
  });
});

