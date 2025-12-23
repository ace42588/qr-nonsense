/**
 * Tests for codeword utilities
 * These tests verify type safety and functionality
 */

import { describe, it, expect } from 'vitest';
import {
  getCodeword,
  getECCodeword,
  getCodewordsFromSegments,
  interleave,
} from '@/domain/qr/codewords/utils';
import { getBits } from '@/domain/qr/codewords/bits';
import type { Codeword, Source, Segment, Bit } from '@/domain/shared/types';

describe('Codeword Utils Tests', () => {
  describe('getCodeword', () => {
    it('should create codeword with 8 bits', () => {
      const bits: Bit[] = Array.from({ length: 8 }, (_, i) => ({
        id: `bit-${i}`,
        value: i % 2,
        sourceId: 'test-source',
      }));

      const codeword = getCodeword(bits, 'data');

      expect(codeword).toHaveProperty('type', 'data');
      expect(codeword).toHaveProperty('id');
      expect(codeword).toHaveProperty('bits');
      expect(codeword.bits).toHaveLength(8);
      expect(codeword.bits).toEqual(bits);
    });

    it('should throw error for invalid bit count', () => {
      const bits: Bit[] = Array.from({ length: 7 }, (_, i) => ({
        id: `bit-${i}`,
        value: 0,
        sourceId: 'test-source',
      }));

      expect(() => {
        getCodeword(bits, 'data');
      }).toThrow('Invalid bits for getCodeword()');
    });

    it('should create error correction codeword', () => {
      const bits: Bit[] = Array.from({ length: 8 }, (_, i) => ({
        id: `bit-${i}`,
        value: 0,
        sourceId: 'test-source',
      }));

      const codeword = getCodeword(bits, 'errorCorrection');

      expect(codeword.type).toBe('errorCorrection');
    });
  });

  describe('getECCodeword', () => {
    it('should create EC codeword with Source type', () => {
      const source: Source = {
        id: 'ec-source-1',
        name: 'Error Correction Source',
        type: 'errorCorrection',
      };

      const codeword = getECCodeword(0x42, source);

      expect(codeword.type).toBe('errorCorrection');
      expect(codeword).toHaveProperty('id');
      expect(codeword).toHaveProperty('bits');
      expect(codeword.bits).toHaveLength(8);
      expect(codeword.source).toBe(source);
    });

    it('should properly encode byte value into bits', () => {
      const source: Source = {
        id: 'test-source',
      };

      const codeword = getECCodeword(0b10101010, source);

      expect(codeword.bits).toHaveLength(8);
      // Verify bits are correct (0b10101010 = 170)
      const bitValues = codeword.bits.map((b) => b.value);
      expect(bitValues).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    });

    it('should accept Source with all optional properties', () => {
      const source: Source = {
        id: 'full-source',
        name: 'Full Source',
        type: 'customType',
      };

      const codeword = getECCodeword(123, source);

      expect(codeword.source).toEqual(source);
      expect(codeword.source?.name).toBe('Full Source');
      expect(codeword.source?.type).toBe('customType');
    });
  });

  describe('getCodewordsFromSegments', () => {
    it('should convert segments to codewords', () => {
      const source: Source = { id: 'test-source' };
      const segments: Segment[] = [
        {
          id: 'seg-1',
          value: 0b10101010,
          length: 8,
          bitIds: [],
        },
        {
          id: 'seg-2',
          value: 0b01010101,
          length: 8,
          bitIds: [],
        },
      ];

      const codewords = getCodewordsFromSegments(segments);

      expect(codewords).toHaveLength(2);
      codewords.forEach((cw) => {
        expect(cw.type).toBe('data');
        expect(cw.bits).toHaveLength(8);
      });
    });

    it('should throw error if segments cannot be divided into codewords', () => {
      const source: Source = { id: 'test-source' };
      const segments: Segment[] = [
        {
          id: 'seg-1',
          value: 0b1010101,
          length: 7, // Not divisible by 8
          bitIds: [],
        },
      ];

      expect(() => {
        getCodewordsFromSegments(segments);
      }).toThrow('Encoded data cannot be broken up into codewords');
    });
  });

  describe('interleave', () => {
    it('should interleave arrays correctly', () => {
      const blocks = [
        [1, 2, 3],
        [4, 5],
        [6, 7, 8, 9],
      ];

      const result = interleave(blocks);

      expect(result).toEqual([1, 4, 6, 2, 5, 7, 3, 8, 9]);
    });

    it('should handle empty blocks', () => {
      const blocks: number[][] = [[], [1, 2], [3]];

      const result = interleave(blocks);

      expect(result).toEqual([1, 3, 2]);
    });

    it('should handle single block', () => {
      const blocks = [[1, 2, 3]];

      const result = interleave(blocks);

      expect(result).toEqual([1, 2, 3]);
    });
  });
});

