/**
 * QArt data append functionality
 * 
 * Allows appending user-specified data to segments before QArt generation,
 * either by extending an existing segment or creating a new segment.
 */

import { Segment, VersionInfo } from "../shared/types";
import { encodeNumeric } from "../qr/encoders/numeric";
import { encodeAlphanumeric } from "../qr/encoders/alphanumeric";
import { encodeByte } from "../qr/encoders/byte";
import { getNumBits } from "../qr/encoders/utils";
import { QArtAppendData } from "./index";
import { decodeSegmentValue } from "./decodeSegments";

/**
 * Special segment type marker for QArt-optimizable appended data
 * These segments are treated like padding segments - they can be modified by QArt
 */
const QART_APPEND_TYPE = "qartAppend";

// Alphanumeric character set: 0-9A-Z $%*+-./:
const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/**
 * Validates if a separator string conforms to the specified encoding mode
 */
export function validateSeparatorForMode(separator: string, mode: string): boolean {
  if (!separator) return true; // Empty separator is valid
  
  switch (mode) {
    case "numeric":
      return /^\d+$/.test(separator);
    case "alphanumeric":
      return separator.split("").every(char => ALPHANUMERIC_CHARS.includes(char.toUpperCase()));
    case "byte":
      return true; // Byte mode accepts any characters
    default:
      return false;
  }
}

/**
 * Validates if data conforms to the specified encoding mode
 */
export function validateDataForMode(data: string, mode: string): boolean {
  if (!data) return true; // Empty data is valid
  
  switch (mode) {
    case "numeric":
      return /^\d+$/.test(data);
    case "alphanumeric":
      return data.split("").every(char => ALPHANUMERIC_CHARS.includes(char.toUpperCase()));
    case "byte":
      return true; // Byte mode accepts any characters
    default:
      return false;
  }
}

/**
 * Gets the encoding mode of a data segment
 * Returns the mode based on the segment's inputMode property or type
 * @internal - Currently unused but kept for potential future use
 */
// @ts-expect-error - Function is declared but not currently used
function getSegmentMode(segment: Segment): string | null {
  // Check if segment has inputMode property (from createDataSymbol)
  if ((segment as any).inputMode) {
    return (segment as any).inputMode;
  }
  
  // Check segment type as fallback
  if (segment.type === "data") {
    // Try to infer from surrounding segments or default to byte
    return "byte";
  }
  
  return null;
}

/**
 * Finds the last data segment group before padding/terminator/fill
 * Returns the segment group info
 */
function findLastDataSegmentGroup(segments: Segment[]): { start: number; end: number; mode: string } | null {
  // Find all segment groups
  const groups: Array<{ start: number; end: number; mode: string }> = [];
  let searchIndex = 0;
  
  while (searchIndex < segments.length) {
    const group = findSegmentGroup(segments, searchIndex);
    if (!group || !group.mode) {
      searchIndex++;
      continue;
    }
    
    groups.push({ start: group.start, end: group.end, mode: group.mode });
    searchIndex = group.end;
  }
  
  if (groups.length === 0) return null;
  
  // Return the last group
  return groups[groups.length - 1];
}

/**
 * Finds the insertion point for new segments (before padding/terminator/fill)
 */
function findInsertionPoint(segments: Segment[]): number {
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg.type === "padding" || seg.type === "terminator" || seg.type === "fill") {
      return i;
    }
  }
  return segments.length;
}

/**
 * Finds a segment group (modeIndicator + characterCount + data segments)
 * Returns the indices [start, end) of the group
 */
function findSegmentGroup(segments: Segment[], startIndex: number): { start: number; end: number; mode: string | null } | null {
  if (startIndex >= segments.length) return null;
  
  // Look for modeIndicator
  let modeIndicatorIndex = -1;
  for (let i = startIndex; i < segments.length; i++) {
    if (segments[i].type === "modeIndicator") {
      modeIndicatorIndex = i;
      break;
    }
  }
  
  if (modeIndicatorIndex === -1) return null;
  
  // Get the mode from the modeIndicator value
  const modeBits = segments[modeIndicatorIndex].value;
  let mode: string | null = null;
  if (modeBits === 0x1) mode = "numeric";
  else if (modeBits === 0x2) mode = "alphanumeric";
  else if (modeBits === 0x4) mode = "byte";
  
  // Find characterCountIndicator (should be next)
  let charCountIndex = modeIndicatorIndex + 1;
  if (charCountIndex >= segments.length || segments[charCountIndex].type !== "characterCountIndicator") {
    return null;
  }
  
  // Find all data segments until we hit another modeIndicator, terminator, fill, or padding
  let endIndex = charCountIndex + 1;
  while (endIndex < segments.length) {
    const seg = segments[endIndex];
    if (seg.type === "data") {
      endIndex++;
    } else if (seg.type === "modeIndicator" || seg.type === "terminator" || seg.type === "fill" || seg.type === "padding") {
      break;
    } else {
      endIndex++;
    }
  }
  
  return { start: modeIndicatorIndex, end: endIndex, mode };
}

/**
 * Extracts original text from data segments
 */
export function extractTextFromDataSegments(segments: Segment[], startIndex: number, endIndex: number, mode: string): string {
  const dataSegments = segments.slice(startIndex, endIndex).filter(s => s.type === "data" || s.type === "qartAppend");
  
  // Decode each segment value to text based on the encoding mode
  return dataSegments.map(s => decodeSegmentValue(s, mode)).join("");
}

/**
 * Generates placeholder data for QArt optimization based on encoding mode and length
 */
function generatePlaceholderData(mode: string, length: number): string {
  switch (mode) {
    case "numeric":
      return "0".repeat(length);
    case "alphanumeric":
      // Use spaces as placeholder (valid alphanumeric character)
      return " ".repeat(length);
    case "byte":
      // Use null bytes as placeholder
      return "\0".repeat(length);
    default:
      throw new Error(`Unsupported encoding mode: ${mode}`);
  }
}

/**
 * Calculates the optimal append length based on available capacity
 * Returns the maximum number of characters/bytes that can be appended
 * 
 * Accounts for:
 * - Mode indicator overhead (4 bits)
 * - Character count indicator overhead (varies by mode/version)
 * - Terminator bits that will be added (up to 4 bits)
 * - Fill bits that may be needed (0-7 bits)
 * - Padding that will be added (we want to maximize append data, so use most of padding space)
 */
function calculateOptimalAppendLength(
  segments: Segment[],
  versionInfo: VersionInfo,
  mode: string
): number {
  const { requiredDataCodewords } = versionInfo;
  const capacityBits = requiredDataCodewords * 8;
  const currentBits = getNumBits(segments);
  const availableBits = capacityBits - currentBits;
  
  if (availableBits <= 0) {
    return 0;
  }
  
  // Reserve space for terminator (up to 4 bits) and fill (0-7 bits)
  // We'll calculate more precisely, but reserve ~12 bits as safety margin
  const reservedBits = 12;
  
  // Account for overhead: mode indicator (4 bits) + character count indicator
  // Character count length varies by mode and version
  let charCountBits: number;
  const version = versionInfo.version;
  
  switch (mode) {
    case "numeric":
      if (version < 10) charCountBits = 10;
      else if (version < 27) charCountBits = 12;
      else charCountBits = 14;
      break;
    case "alphanumeric":
      if (version < 10) charCountBits = 9;
      else if (version < 27) charCountBits = 11;
      else charCountBits = 13;
      break;
    case "byte":
      if (version < 10) charCountBits = 8;
      else charCountBits = 16;
      break;
    default:
      charCountBits = 16; // Conservative default
  }
  
  const overheadBits = 4 + charCountBits + reservedBits; // mode + char count + safety margin
  
  // Calculate bits available for actual data
  const dataBitsAvailable = availableBits - overheadBits;
  
  if (dataBitsAvailable <= 0) {
    return 0;
  }
  
  // Calculate how many characters/bytes can fit
  // Account for encoding efficiency (bits per character varies by mode)
  switch (mode) {
    case "numeric":
      // Numeric: 3.33 bits per digit (10 bits for 3 digits)
      // Use 90% of available to leave room for terminator/fill
      return Math.floor((dataBitsAvailable * 3 * 0.9) / 10);
    case "alphanumeric":
      // Alphanumeric: 5.5 bits per character (11 bits for 2 characters)
      // Use 90% of available to leave room for terminator/fill
      return Math.floor((dataBitsAvailable * 2 * 0.9) / 11);
    case "byte":
      // Byte: 8 bits per byte
      // Use 90% of available to leave room for terminator/fill
      return Math.floor((dataBitsAvailable * 0.9) / 8);
    default:
      return 0;
  }
}

/**
 * Appends placeholder data to segments according to the append configuration
 * Automatically calculates optimal length based on available capacity
 * Returns a new segments array without mutating the original
 * The placeholder data will be optimized by QArt
 */
export function appendDataToSegments(
  segments: Segment[],
  appendConfig: QArtAppendData,
  versionInfo: VersionInfo
): Segment[] {
  if (!appendConfig.enabled) {
    return segments;
  }

  // Create a deep copy of segments to avoid mutation
  const newSegments = segments.map(s => ({ ...s }));

  if (appendConfig.method === "existing") {
    // Find the last data segment group
    const lastGroup = findLastDataSegmentGroup(newSegments);
    
    if (!lastGroup) {
      // No data segments found, fall back to new segment method
      return appendDataToSegments(
        segments,
        { ...appendConfig, method: "new", encodingMode: appendConfig.encodingMode || "byte" },
        versionInfo
      );
    }

    // Validate separator
    if (appendConfig.separator && !validateSeparatorForMode(appendConfig.separator, lastGroup.mode)) {
      throw new Error(`Separator "${appendConfig.separator}" does not conform to ${lastGroup.mode} encoding mode`);
    }

    // Extract original text from data segments (stored for potential future use)
    extractTextFromDataSegments(newSegments, lastGroup.start, lastGroup.end, lastGroup.mode);
    
    // Calculate optimal append length based on available capacity
    const optimalLength = calculateOptimalAppendLength(
      newSegments,
      versionInfo,
      lastGroup.mode
    );
    
    if (optimalLength <= 0) {
      // No capacity available, return segments as-is
      return segments;
    }
    
    // Generate placeholder data for QArt to optimize
    const placeholderData = generatePlaceholderData(lastGroup.mode, optimalLength);
    
    const separator = appendConfig.separator || "";
    
    // Encode separator and placeholder separately
    // Separator should remain fixed (not optimized), placeholder will be optimized
    let separatorSegments: Segment[] = [];
    let placeholderSegments: Segment[] = [];
    
    // Get encoding for byte mode if needed
    let byteEncoding = "utf-8";
    if (lastGroup.mode === "byte") {
      const firstDataSeg = newSegments.slice(lastGroup.start, lastGroup.end).find(s => s.type === "data");
      byteEncoding = (firstDataSeg as any)?.inputEncoding || "utf-8";
    }
    
    // Encode separator separately (if it exists) - keep as regular data segments
    if (separator) {
      switch (lastGroup.mode) {
        case "numeric": {
          const fullGroup = encodeNumeric(separator);
          separatorSegments = fullGroup.filter(s => s.type === "data");
          break;
        }
        case "alphanumeric": {
          const fullGroup = encodeAlphanumeric(separator);
          separatorSegments = fullGroup.filter(s => s.type === "data");
          break;
        }
        case "byte": {
          const fullGroup = encodeByte(separator, byteEncoding);
          separatorSegments = fullGroup.filter(s => s.type === "data");
          break;
        }
        default:
          throw new Error(`Unsupported encoding mode: ${lastGroup.mode}`);
      }
    }
    
    // Encode placeholder separately - will be marked as qartAppend
    switch (lastGroup.mode) {
      case "numeric": {
        const fullGroup = encodeNumeric(placeholderData);
        placeholderSegments = fullGroup.filter(s => s.type === "data");
        break;
      }
      case "alphanumeric": {
        const fullGroup = encodeAlphanumeric(placeholderData);
        placeholderSegments = fullGroup.filter(s => s.type === "data");
        break;
      }
      case "byte": {
        const fullGroup = encodeByte(placeholderData, byteEncoding);
        placeholderSegments = fullGroup.filter(s => s.type === "data");
        break;
      }
      default:
        throw new Error(`Unsupported encoding mode: ${lastGroup.mode}`);
    }

    if (placeholderSegments.length === 0) {
      throw new Error("Failed to encode placeholder data");
    }

    // Mark ONLY placeholder segments as QArt-optimizable (separator remains fixed)
    const markedPlaceholderSegments = placeholderSegments.map(seg => ({
      ...seg,
      type: QART_APPEND_TYPE
    }));
    
    // Combine separator (fixed) + placeholder (optimizable) segments
    const allAppendSegments = [...separatorSegments, ...markedPlaceholderSegments];

    // Calculate new total character count (original + separator + placeholder)
    const originalCharCount = newSegments[lastGroup.start + 1].value; // characterCountIndicator value
    const appendedDataLength = separator.length + placeholderData.length;
    const newCharCount = originalCharCount + appendedDataLength;
    
    // Update character count indicator
    // Character count indicator length depends on version and mode thresholds
    const charCountIndicator = newSegments[lastGroup.start + 1];
    let newCharCountLength = charCountIndicator.length;
    
    // Check if we need to update the length based on thresholds
    // For numeric: thresholds are [10, 12, 14] bits for versions <10, <27, >=27
    // For alphanumeric: thresholds are [9, 11, 13] bits for versions <10, <27, >=27
    // For byte: thresholds are [8, 16] bits for versions <10, >=10
    const version = versionInfo.version;
    if (lastGroup.mode === "numeric") {
      if (version < 10 && newCharCount >= 10) newCharCountLength = 12;
      else if (version < 27 && newCharCount >= 1000) newCharCountLength = 14;
      else if (version >= 27 && newCharCount < 1000) newCharCountLength = 12;
    } else if (lastGroup.mode === "alphanumeric") {
      if (version < 10 && newCharCount >= 45) newCharCountLength = 11;
      else if (version < 27 && newCharCount >= 1225) newCharCountLength = 13;
      else if (version >= 27 && newCharCount < 1225) newCharCountLength = 11;
    } else if (lastGroup.mode === "byte") {
      if (version < 10 && newCharCount >= 256) newCharCountLength = 16;
      else if (version >= 10 && newCharCount < 256) newCharCountLength = 8;
    }
    
    const updatedCharCountIndicator = {
      ...charCountIndicator,
      value: newCharCount,
      length: newCharCountLength
    };

    // Build the new segment structure:
    // - Keep original mode indicator (unchanged)
    // - Update character count indicator
    // - Keep original data segments (unchanged)
    // - Append separator segments (fixed, regular data) + placeholder segments (marked as qartAppend)
    const modeIndicator = newSegments[lastGroup.start];
    const originalDataSegments = newSegments.slice(lastGroup.start + 2, lastGroup.end); // Skip mode indicator and char count
    const afterGroup = newSegments.slice(lastGroup.end);
    
    const beforeGroup = newSegments.slice(0, lastGroup.start);
    return [
      ...beforeGroup,
      modeIndicator,
      updatedCharCountIndicator,
      ...originalDataSegments,
      ...allAppendSegments,
      ...afterGroup
    ];
  } else {
    // New segment method
    if (!appendConfig.encodingMode) {
      throw new Error("Encoding mode is required when using 'new' append method");
    }

    // Calculate optimal append length based on available capacity
    const optimalLength = calculateOptimalAppendLength(
      newSegments,
      versionInfo,
      appendConfig.encodingMode
    );
    
    if (optimalLength <= 0) {
      // No capacity available, return segments as-is
      return segments;
    }
    
    // Generate placeholder data for QArt to optimize
    const placeholderData = generatePlaceholderData(appendConfig.encodingMode, optimalLength);

    // Encode the placeholder data
    let newSegmentGroup: Segment[];
    switch (appendConfig.encodingMode) {
      case "numeric":
        newSegmentGroup = encodeNumeric(placeholderData);
        break;
      case "alphanumeric":
        newSegmentGroup = encodeAlphanumeric(placeholderData);
        break;
      case "byte":
        newSegmentGroup = encodeByte(placeholderData, "utf-8");
        break;
      default:
        throw new Error(`Unsupported encoding mode: ${appendConfig.encodingMode}`);
    }

    if (newSegmentGroup.length === 0) {
      throw new Error("Failed to encode appended data");
    }

    // Mark data segments as QArt-optimizable
    // Only mark the data symbols, not mode indicator or character count
    const markedGroup = newSegmentGroup.map(seg => {
      if (seg.type === "data") {
        return { ...seg, type: QART_APPEND_TYPE };
      }
      return seg;
    });

    // Find insertion point (before padding/terminator/fill)
    const insertIndex = findInsertionPoint(newSegments);
    
    // Insert new segment group
    const beforeInsert = newSegments.slice(0, insertIndex);
    const afterInsert = newSegments.slice(insertIndex);
    return [...beforeInsert, ...markedGroup, ...afterInsert];
  }
}

