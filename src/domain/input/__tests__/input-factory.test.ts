/**
 * Tests for input factory
 * These tests verify that createInput returns proper Input type
 */

import { describe, it, expect } from 'vitest';
import { createInput, getInputTypeDefaults, DEFAULT_FIELD } from '@/state/inputs/inputFactory';
import type { Input } from '@/app/types';

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

    it('should create template input with all required properties', () => {
      const input = createInput({ type: 'template', label: 'Template Input' });

      expect(input.type).toBe('template');
      expect(input.label).toBe('Template Input');
      expect(input.template).toBe('wifi');
      expect(typeof input.templateFields).toBe('object');
      expect(input.templateFields).toHaveProperty('ssid');
    });

    it('should create structuredAppend input with all required properties', () => {
      const input = createInput({
        type: 'structuredAppend',
        label: 'SA Input',
      });

      expect(input.type).toBe('structuredAppend');
      expect(input.mode).toBe('structuredAppend');
      expect(input.label).toBe('SA Input');
      expect(input.symbolIndex).toBe(0);
      expect(input.totalSymbols).toBe(2);
      expect(input.parity).toBe(0);
    });

    it('should create fnc1 input with all required properties', () => {
      const input = createInput({ type: 'fnc1', label: 'FNC1 Input' });

      expect(input.type).toBe('fnc1');
      expect(input.mode).toBe('fnc1');
      expect(input.label).toBe('FNC1 Input');
      expect(input.fnc1Position).toBe('first');
      expect(input.payloadMode).toBe('alphanumeric');
      expect(typeof input.data).toBe('string');
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
      if (defaults.type === 'string') {
        expect(defaults.mode).toBe('byte');
        expect(typeof defaults.text).toBe('string');
      }
    });

    it('should return json defaults', () => {
      const defaults = getInputTypeDefaults('json');

      expect(defaults.type).toBe('json');
      if (defaults.type === 'json') {
        expect(defaults).toHaveProperty('obj');
        expect(defaults).toHaveProperty('schema');
        expect(defaults.schemaName).toBe('jsonSchema');
      }
    });

    it('should return bitfield defaults', () => {
      const defaults = getInputTypeDefaults('bitfield');

      expect(defaults.type).toBe('bitfield');
      if (defaults.type === 'bitfield') {
        expect(Array.isArray(defaults.layout)).toBe(true);
        expect(typeof defaults.values).toBe('object');
      }
    });

    it('should return mac defaults', () => {
      const defaults = getInputTypeDefaults('mac');

      expect(defaults.type).toBe('mac');
      if (defaults.type === 'mac') {
        expect(defaults.algo).toBe('Poly1305');
        expect(typeof defaults.key).toBe('string');
        expect(Array.isArray(defaults.includedFields)).toBe(true);
      }
    });

    it('should return template defaults', () => {
      const defaults = getInputTypeDefaults('template');

      expect(defaults.type).toBe('template');
      if (defaults.type === 'template') {
        expect(defaults.template).toBe('wifi');
        expect(typeof defaults.templateFields).toBe('object');
        expect(defaults.templateFields).toHaveProperty('ssid');
      }
    });

    it('should return structuredAppend defaults', () => {
      const defaults = getInputTypeDefaults('structuredAppend');

      expect(defaults.type).toBe('structuredAppend');
      if (defaults.type === 'structuredAppend') {
        expect(defaults.mode).toBe('structuredAppend');
        expect(defaults.symbolIndex).toBe(0);
        expect(defaults.totalSymbols).toBe(2);
        expect(defaults.parity).toBe(0);
      }
    });

    it('should return fnc1 defaults', () => {
      const defaults = getInputTypeDefaults('fnc1');

      expect(defaults.type).toBe('fnc1');
      if (defaults.type === 'fnc1') {
        expect(defaults.mode).toBe('fnc1');
        expect(defaults.fnc1Position).toBe('first');
        expect(defaults.payloadMode).toBe('alphanumeric');
      }
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

