/**
 * Tests for input factory
 * These tests verify that createInput returns proper Input type
 */

import { describe, it, expect } from 'vitest';
import { createInput, getInputTypeDefaults, DEFAULT_FIELD } from '@/state/inputs/inputFactory';
import type { Input } from '@/types';

describe('Input Factory Tests', () => {
  describe('createInput return type', () => {
    it('should return Input type, not any', () => {
      const input = createInput({ type: 'string', label: 'Test' });

      // Type check: should be assignable to Input
      const typedInput: Input = input;
      
      expect(typedInput).toHaveProperty('id');
      expect(typedInput).toHaveProperty('type');
      expect(typedInput).toHaveProperty('data');
      expect(typedInput).toHaveProperty('mode');
      expect(typedInput).toHaveProperty('label');
    });

    it('should create string input with all required properties', () => {
      const input = createInput({ type: 'string', label: 'String Input' });

      expect(input.type).toBe('string');
      expect(input.mode).toBe('byte');
      expect(input.label).toBe('String Input');
      expect(typeof input.data).toBe('string');
      expect(input).toHaveProperty('id');
      expect(typeof input.id).toBe('string');
    });

    it('should create json input with all required properties', () => {
      const input = createInput({ type: 'json', label: 'JSON Input' });

      expect(input.type).toBe('json');
      expect(input.label).toBe('JSON Input');
      expect(input).toHaveProperty('obj');
      expect(input).toHaveProperty('schema');
      expect(input).toHaveProperty('schemaName');
      expect(input).toHaveProperty('encoding');
    });

    it('should create bitfield input with all required properties', () => {
      const input = createInput({ type: 'bitfield', label: 'BitField Input' });

      expect(input.type).toBe('bitfield');
      expect(input.label).toBe('BitField Input');
      expect(Array.isArray(input.layout)).toBe(true);
      expect(typeof input.values).toBe('object');
    });

    it('should create mac input with all required properties', () => {
      const input = createInput({ type: 'mac', label: 'MAC Input' });

      expect(input.type).toBe('mac');
      expect(input.label).toBe('MAC Input');
      expect(input).toHaveProperty('algo');
      expect(input).toHaveProperty('key');
      expect(Array.isArray(input.includedFields)).toBe(true);
    });

    it('should generate unique IDs for each input', () => {
      const input1 = createInput();
      const input2 = createInput();

      expect(input1.id).not.toBe(input2.id);
    });

    it('should allow overriding default properties', () => {
      const customId = 'custom-id-123';
      const input = createInput({
        type: 'string',
        id: customId,
        label: 'Custom Input',
        data: 'custom data',
      });

      expect(input.id).toBe(customId);
      expect(input.label).toBe('Custom Input');
      expect(input.data).toBe('custom data');
    });

    it('should use default label when not provided', () => {
      const input = createInput({ type: 'string' });

      expect(input.label).toBe('New Input');
    });
  });

  describe('getInputTypeDefaults', () => {
    it('should return string defaults', () => {
      const defaults = getInputTypeDefaults('string');

      expect(defaults.type).toBe('string');
      expect(defaults.mode).toBe('byte');
      expect(typeof defaults.text).toBe('string');
    });

    it('should return json defaults', () => {
      const defaults = getInputTypeDefaults('json');

      expect(defaults.type).toBe('json');
      expect(defaults).toHaveProperty('obj');
      expect(defaults).toHaveProperty('schema');
      expect(defaults.schemaName).toBe('jsonSchema');
    });

    it('should return bitfield defaults', () => {
      const defaults = getInputTypeDefaults('bitfield');

      expect(defaults.type).toBe('bitfield');
      expect(Array.isArray(defaults.layout)).toBe(true);
      expect(typeof defaults.values).toBe('object');
    });

    it('should return mac defaults', () => {
      const defaults = getInputTypeDefaults('mac');

      expect(defaults.type).toBe('mac');
      expect(defaults.algo).toBe('Poly1305');
      expect(typeof defaults.key).toBe('string');
      expect(Array.isArray(defaults.includedFields)).toBe(true);
    });
  });

  describe('DEFAULT_FIELD', () => {
    it('should have all required field properties', () => {
      expect(DEFAULT_FIELD).toHaveProperty('label');
      expect(DEFAULT_FIELD).toHaveProperty('min');
      expect(DEFAULT_FIELD).toHaveProperty('max');
      expect(DEFAULT_FIELD).toHaveProperty('bitWidth');
      expect(DEFAULT_FIELD).toHaveProperty('type');
      expect(DEFAULT_FIELD).toHaveProperty('mode');
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_FIELD.min).toBe(0);
      expect(DEFAULT_FIELD.max).toBe(255);
      expect(DEFAULT_FIELD.bitWidth).toBe(8);
    });
  });
});

