/**
 * Test utilities for QArt tests
 * Helper functions for creating mock data and validating results
 */

import { QRBlock } from "@/domain/qr/codewords/blocks";
import { Codeword, Bit, QRMatrix, QRModule } from "@/types";
import { BlockBasisState } from "@/domain/qart/types";

/**
 * Create a mock bit with specified value
 */
export function createMockBit(value: number, bitId: string, sourceId: string): Bit {
  return {
    value,
    id: bitId,
    sourceId,
  };
}

/**
 * Create a mock codeword with specified byte value
 */
export function createMockCodeword(
  byteValue: number,
  codewordId: string,
  sourceId: string,
  type: "data" | "errorCorrection" = "data"
): Codeword {
  const bits: Bit[] = [];
  for (let i = 0; i < 8; i++) {
    const bitValue = (byteValue >> (7 - i)) & 1;
    bits.push(createMockBit(bitValue, `${codewordId}-bit-${i}`, sourceId));
  }
  return {
    type,
    id: codewordId,
    bits,
    source: {
      id: sourceId,
      type: type === "data" ? "data" : "errorCorrection",
    },
  };
}

/**
 * Create a mock QR block with specified data and EC codewords
 */
export function createMockBlock(
  dataBytes: number[],
  ecBytes: number[],
  blockIndex: number = 0
): QRBlock {
  const dataCodewords = dataBytes.map((byte, idx) =>
    createMockCodeword(byte, `block-${blockIndex}-data-${idx}`, `source-${blockIndex}`, "data")
  );
  const ecCodewords = ecBytes.map((byte, idx) =>
    createMockCodeword(byte, `block-${blockIndex}-ec-${idx}`, `source-${blockIndex}`, "errorCorrection")
  );
  return {
    data: dataCodewords,
    errorCorrection: ecCodewords,
  };
}

/**
 * Create a simple test block (1 data codeword, 1 EC codeword)
 */
export function createSimpleTestBlock(blockIndex: number = 0): QRBlock {
  return createMockBlock([0x12], [0x34], blockIndex);
}

/**
 * Create a mock target grid (brightness values 0-1)
 */
export function createMockTargetGrid(
  dimension: number,
  pattern: "checkerboard" | "solid" | "gradient" | "random" = "checkerboard"
): Float32Array {
  const grid = new Float32Array(dimension * dimension);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      let brightness: number;
      switch (pattern) {
        case "checkerboard":
          brightness = (x + y) % 2 === 0 ? 0.0 : 1.0;
          break;
        case "solid":
          brightness = 0.5;
          break;
        case "gradient":
          brightness = (x + y) / (dimension * 2);
          break;
        case "random":
          brightness = Math.random();
          break;
        default:
          brightness = 0.5;
      }
      grid[y * dimension + x] = brightness;
    }
  }
  return grid;
}

/**
 * Create a mock QR matrix with modules
 */
export function createMockQRMatrix(
  dimension: number,
  pattern: "checkerboard" | "solid" | "random" = "checkerboard"
): QRMatrix {
  const matrix: QRMatrix = [];
  const bitIdToModule = new Map<string, QRModule>();
  
  for (let y = 0; y < dimension; y++) {
    matrix[y] = [];
    for (let x = 0; x < dimension; x++) {
      let isDark: boolean;
      switch (pattern) {
        case "checkerboard":
          isDark = (x + y) % 2 === 0;
          break;
        case "solid":
          isDark = false;
          break;
        case "random":
          isDark = Math.random() > 0.5;
          break;
        default:
          isDark = false;
      }
      const bitId = `bit-${y}-${x}`;
      const module: QRModule = {
        id: `module-${y}-${x}`,
        bitId,
        bit: createMockBit(isDark ? 1 : 0, bitId, `source-${y}-${x}`),
        x,
        y,
        isDark,
        isMasked: false,
        type: "data",
        nonData: false,
      };
      matrix[y][x] = module;
      bitIdToModule.set(bitId, module);
    }
  }

  // Add getModuleByBitId method
  matrix.getModuleByBitId = (bitId: string): QRModule | undefined => {
    return bitIdToModule.get(bitId);
  };

  return matrix;
}

/**
 * Compare two QR matrices for equality
 */
export function compareMatrices(matrix1: QRMatrix, matrix2: QRMatrix): boolean {
  if (matrix1.length !== matrix2.length) return false;
  for (let y = 0; y < matrix1.length; y++) {
    if (matrix1[y].length !== matrix2[y].length) return false;
    for (let x = 0; x < matrix1[y].length; x++) {
      const m1 = matrix1[y][x];
      const m2 = matrix2[y][x];
      if (!m1 || !m2) {
        if (m1 !== m2) return false;
        continue;
      }
      if (m1.isDark !== m2.isDark) return false;
      if (m1.x !== m2.x || m1.y !== m2.y) return false;
    }
  }
  return true;
}

/**
 * Validate basis matrix properties
 * Checks that basis vectors are linearly independent and span the space
 */
export function validateBasisMatrix(state: BlockBasisState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { B, M } = state;
  const nd = state.dataBytes.length;
  const nc = state.ecBytes.length;
  const totalBytes = nd + nc;

  // Check dimensions
  if (B.length !== totalBytes) {
    errors.push(`B length mismatch: expected ${totalBytes}, got ${B.length}`);
  }
  if (M.length !== nd * 8) {
    errors.push(`M length mismatch: expected ${nd * 8}, got ${M.length}`);
  }

  // Check each basis vector has correct length
  for (let i = 0; i < M.length; i++) {
    if (M[i].length !== totalBytes) {
      errors.push(`M[${i}] length mismatch: expected ${totalBytes}, got ${M[i].length}`);
    }
  }

  // Check that basis vectors are unit vectors in data space
  for (let i = 0; i < M.length; i++) {
    const row = M[i];
    const expectedByte = Math.floor(i / 8);
    const expectedBit = 7 - (i % 8);
    const expectedValue = 1 << expectedBit;
    
    // Check data part
    for (let j = 0; j < nd; j++) {
      if (j === expectedByte) {
        if (row[j] !== expectedValue) {
          errors.push(`M[${i}] data byte ${j} mismatch: expected ${expectedValue}, got ${row[j]}`);
        }
      } else {
        if (row[j] !== 0) {
          errors.push(`M[${i}] data byte ${j} should be 0, got ${row[j]}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a test image (ImageData) for testing
 */
export function createTestImageData(
  width: number,
  height: number,
  pattern: "checkerboard" | "solid" | "gradient" = "checkerboard"
): ImageData {
  // Use global ImageData if available, otherwise create a mock
  const ImageDataConstructor = typeof ImageData !== 'undefined' ? ImageData : (() => {
    class MockImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    }
    return MockImageData as any;
  })();
  
  const imageData = new ImageDataConstructor(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r: number, g: number, b: number;

      switch (pattern) {
        case "checkerboard": {
          const isDark = (x + y) % 2 === 0;
          r = g = b = isDark ? 0 : 255;
          break;
        }
        case "solid":
          r = g = b = 128;
          break;
        case "gradient":
          r = g = b = Math.floor((x + y) / (width + height) * 255);
          break;
        default:
          r = g = b = 128;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255; // Alpha
    }
  }

  return imageData;
}

/**
 * Extract bytes from a QR block
 */
export function extractBytesFromBlock(block: QRBlock): {
  dataBytes: number[];
  ecBytes: number[];
} {
  const dataBytes = block.data.map((cw) => {
    let byte = 0;
    for (let i = 0; i < 8; i++) {
      byte |= (cw.bits[i].value << (7 - i));
    }
    return byte;
  });

  const ecBytes = block.errorCorrection.map((cw) => {
    let byte = 0;
    for (let i = 0; i < 8; i++) {
      byte |= (cw.bits[i].value << (7 - i));
    }
    return byte;
  });

  return { dataBytes, ecBytes };
}

/**
 * Check if two blocks are equal
 */
export function compareBlocks(block1: QRBlock, block2: QRBlock): boolean {
  if (block1.data.length !== block2.data.length) return false;
  if (block1.errorCorrection.length !== block2.errorCorrection.length) return false;

  const bytes1 = extractBytesFromBlock(block1);
  const bytes2 = extractBytesFromBlock(block2);

  for (let i = 0; i < bytes1.dataBytes.length; i++) {
    if (bytes1.dataBytes[i] !== bytes2.dataBytes[i]) return false;
  }
  for (let i = 0; i < bytes1.ecBytes.length; i++) {
    if (bytes1.ecBytes[i] !== bytes2.ecBytes[i]) return false;
  }

  return true;
}

