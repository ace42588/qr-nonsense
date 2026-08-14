/**
 * Decode optimized segment values back to text
 * 
 * After QArt optimization, segment values have changed but text properties haven't been updated.
 * This module provides functions to decode segment values back to text based on encoding mode.
 */

import { Segment } from "../shared/types";

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
      console.debug('decodeSegmentValue', 'Fallback: try to get text property or return empty', segmentMode); 
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
): { segments: Segment[]; bitsWereClamped: boolean } {
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
  
  // Track if any bits were clamped
  let bitsWereClamped = false;
  
  // Track segments that fail to decode (for debugging)
  const failedSegments: Array<{segmentId: string, reason: string}> = [];
  
  // Update segments with decoded text
  const updatedSegments = segments.map(segment => {
    // Determine which mode to use for this segment
    let segmentMode: string;
    if (segment.type === "qartAppend") {
      // For qartAppend segments, use their inputMode property instead of the passed mode
      // This ensures numeric/alphanumeric segments aren't incorrectly clamped as byte segments
      // BUT: if mode="byte", skip qartAppend segments (they'll be processed separately)
      if (mode === "byte") {
        return segment; // Skip qartAppend segments when processing padding
      }
      segmentMode = (segment as any).inputMode || mode;
    } else if (segment.type === "padding" && mode === "byte") {
      // For padding segments, use the passed mode (should be "byte")
      segmentMode = mode;
    } else {
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
          failedSegments.push({segmentId: segment.id, reason: `Bit not found in codeword ${mapping.codewordIndex} bit ${mapping.bitIndex}`});
          return segment;
        }
      } else {
        // Bit ID not in map, can't decode - return original segment
        failedSegments.push({segmentId: segment.id, reason: `Bit ID ${bitId} not in bitToCodewordMap`});
        return segment;
      }
    }
    
    if (bitValues.length !== segment.length) {
      // Can't decode properly - bit count mismatch
      failedSegments.push({segmentId: segment.id, reason: `Bit count mismatch: expected ${segment.length}, got ${bitValues.length}`});
      return segment;
    }
    
    // Reconstruct segment value from bits
    let reconstructedValue = 0;
    for (let i = 0; i < bitValues.length; i++) {
      reconstructedValue = (reconstructedValue << 1) | bitValues[i];
    }
    
    // Calculate max valid value for this segment using segmentMode
    let maxValue: number;
    if (segmentMode === "numeric") {
      maxValue = segment.length === 10 ? 999 : segment.length === 7 ? 99 : 9;
    } else if (segmentMode === "alphanumeric") {
      maxValue = segment.length === 11 ? 2024 : 44; // 45*45-1 for 2 chars, 44 for 1 char
    } else {
      maxValue = 255; // byte mode
    }
    
    // Clamp invalid values to valid range to prevent decoding failures
    // QArt optimization can create invalid values, but we should decode them as the closest valid value
    const wasClamped = reconstructedValue > maxValue;
    if (wasClamped) {
      bitsWereClamped = true;
      reconstructedValue = maxValue;
      // Update the actual bits in codewords to match the clamped value
      // Convert clamped value to binary bits (MSB first)
      const clampedBits: number[] = [];
      let val = reconstructedValue;
      for (let i = segment.length - 1; i >= 0; i--) {
        clampedBits[i] = val & 1;
        val >>= 1;
      }
      // Update bits in codewords (bits are stored MSB first in segments)
      // CRITICAL: segment.bitIds[0] is MSB, segment.bitIds[length-1] is LSB
      // clampedBits[0] is MSB, clampedBits[length-1] is LSB
      // So clampedBits[i] corresponds to segment.bitIds[i] (both MSB-first)
      let firstCodewordIndex: number | null = null;
      const codewordIndices = new Set<number>();
      for (let i = 0; i < segment.bitIds.length; i++) {
        const bitId = segment.bitIds[i];
        const mapping = bitToCodewordMap.get(bitId);
        if (mapping) {
          if (firstCodewordIndex === null) firstCodewordIndex = mapping.codewordIndex;
          codewordIndices.add(mapping.codewordIndex);
          const codeword = codewords[mapping.codewordIndex];
          if (codeword && codeword.bits && codeword.bits[mapping.bitIndex]) {
            codeword.bits[mapping.bitIndex].value = clampedBits[i];
          }
        }
      }
    }
    
    
    // Create updated segment with new value
    const updatedSegment = {
      ...segment,
      value: reconstructedValue
    };
    
    // Decode the value to text using segmentMode
    const decodedText = decodeSegmentValue(updatedSegment, segmentMode);
    
    // Update segment with decoded text
    type SegmentWithText = Segment & { text?: string };
    return {
      ...updatedSegment,
      text: decodedText
    } as SegmentWithText;
  });
  
  
  return { segments: updatedSegments, bitsWereClamped };
}

