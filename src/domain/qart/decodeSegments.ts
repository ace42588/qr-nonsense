/**
 * Decode optimized segment values back to text
 * 
 * After QArt optimization, segment values have changed but text properties haven't been updated.
 * This module provides functions to decode segment values back to text based on encoding mode.
 */

import { Segment } from "../shared/types";
import { bitsToByte } from "../qr/codewords/bits";

// Alphanumeric character map (same as encoder)
const ALPHANUMERIC_CHAR_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/**
 * Decodes a numeric segment value back to text
 */
function decodeNumericSegment(segment: Segment): string {
  // For numeric, the value IS the number
  // But we need to account for the bit length to determine how many digits
  // Numeric encoding: 3 digits = 10 bits, 2 digits = 7 bits, 1 digit = 4 bits
  const value = segment.value;
  
  if (segment.length === 10) {
    // 3 digits
    return value.toString().padStart(3, '0');
  } else if (segment.length === 7) {
    // 2 digits
    return value.toString().padStart(2, '0');
  } else if (segment.length === 4) {
    // 1 digit
    return value.toString();
  }
  
  // Fallback: just return the value as string
  return value.toString();
}

/**
 * Decodes an alphanumeric segment value back to text
 */
function decodeAlphanumericSegment(segment: Segment): string {
  const value = segment.value;
  
  if (segment.length === 11) {
    // 2 characters: value = char1 * 45 + char2
    const char1Idx = Math.floor(value / 45);
    const char2Idx = value % 45;
    if (char1Idx < ALPHANUMERIC_CHAR_MAP.length && char2Idx < ALPHANUMERIC_CHAR_MAP.length) {
      return ALPHANUMERIC_CHAR_MAP[char1Idx] + ALPHANUMERIC_CHAR_MAP[char2Idx];
    }
  } else if (segment.length === 6) {
    // 1 character: value = char index
    if (value < ALPHANUMERIC_CHAR_MAP.length) {
      return ALPHANUMERIC_CHAR_MAP[value];
    }
  }
  
  // Fallback: try to decode as single character
  if (value < ALPHANUMERIC_CHAR_MAP.length) {
    return ALPHANUMERIC_CHAR_MAP[value];
  }
  
  return "";
}

/**
 * Decodes a byte segment value back to text
 * The value is the byte value (0-255)
 */
function decodeByteSegment(segment: Segment): string {
  const value = segment.value;
  
  // Byte segments are 8 bits, value is the byte (0-255)
  // Convert to character
  if (value >= 32 && value <= 126) {
    // Printable ASCII
    return String.fromCharCode(value);
  } else if (value === 0) {
    return "\0";
  } else {
    // Non-printable, show as hex
    return `\\x${value.toString(16).padStart(2, '0')}`;
  }
}

/**
 * Decodes segment value back to text based on encoding mode
 */
export function decodeSegmentValue(segment: Segment, mode: string): string {
  // Check if segment has inputMode property
  const segmentMode = (segment as any).inputMode || mode;
  
  switch (segmentMode) {
    case "numeric":
      return decodeNumericSegment(segment);
    case "alphanumeric":
      return decodeAlphanumericSegment(segment);
    case "byte":
      return decodeByteSegment(segment);
    default:
      // Fallback: try to get text property or return empty
      return (segment as any).text || "";
  }
}

/**
 * Updates segment text properties from optimized codewords
 * Reads bit values from codewords and decodes them back to segment text
 */
export function updateSegmentTextFromCodewords(
  segments: Segment[],
  codewords: any[],
  mode: string
): Segment[] {
  // Create a map of bit ID to codeword/bit index for quick lookup
  const bitToCodewordMap = new Map<string, { codewordIndex: number; bitIndex: number }>();
  
  codewords.forEach((codeword, cwIdx) => {
    if (codeword.bits) {
      codeword.bits.forEach((bit: any, bitIdx: number) => {
        if (bit && bit.id) {
          bitToCodewordMap.set(bit.id, { codewordIndex: cwIdx, bitIndex: bitIdx });
        }
      });
    }
  });
  
  // Update segments with decoded text
  return segments.map(segment => {
    // Update both qartAppend segments and padding segments (both are optimized by QArt)
    if (segment.type !== "qartAppend" && segment.type !== "padding") {
      return segment;
    }
    
    // Get bits for this segment
    if (!segment.bitIds || segment.bitIds.length === 0) {
      return segment;
    }
    
    // Extract bit values from codewords
    const bitValues: number[] = [];
    for (const bitId of segment.bitIds) {
      const mapping = bitToCodewordMap.get(bitId);
      if (mapping) {
        const codeword = codewords[mapping.codewordIndex];
        if (codeword && codeword.bits && codeword.bits[mapping.bitIndex]) {
          bitValues.push(codeword.bits[mapping.bitIndex].value);
        } else {
          // Bit not found, can't decode - return original segment
          return segment;
        }
      } else {
        // Bit ID not in map, can't decode - return original segment
        return segment;
      }
    }
    
    if (bitValues.length !== segment.length) {
      // Can't decode properly - bit count mismatch
      return segment;
    }
    
    // Reconstruct segment value from bits
    let reconstructedValue = 0;
    for (let i = 0; i < bitValues.length; i++) {
      reconstructedValue = (reconstructedValue << 1) | bitValues[i];
    }
    
    // Create updated segment with new value
    const updatedSegment = {
      ...segment,
      value: reconstructedValue
    };
    
    // Decode the value to text
    const decodedText = decodeSegmentValue(updatedSegment, mode);
    
    // Update segment with decoded text
    type SegmentWithText = Segment & { text?: string };
    return {
      ...updatedSegment,
      text: decodedText
    } as SegmentWithText;
  });
}

