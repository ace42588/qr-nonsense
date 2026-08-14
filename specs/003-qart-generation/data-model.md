# Data Model: QArt QR Code Generation

**Feature**: 003-qart-generation  
**Date**: 2025-01-27

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for QArt QR code generation. The model extends existing QR code generation infrastructure with QArt-specific entities and operations.

## Core Entities

### QArtOptions

**Purpose**: Configuration for QArt QR code generation

**Fields**:
- `segments: Segment[]` - Input data segments (includes padding segments)
- `codewords: Codeword[]` - Data and error correction codewords
- `blocks: QRBlock[]` - Reed-Solomon blocks (data + EC codewords per block)
- `initialMatrix: QRMatrix` - Initial QR code matrix before QArt optimization
- `versionInfo: VersionInfo` - QR code version information (version, capacity, EC blocks)
- `errorCorrectionLevel: number` - Error correction level (0-3)
- `targetImage: ImageData` - Target image to embed in QR code
- `minDecodeRedundancy?: number` - Minimum decode success rate (default: 0.8)
- `decodeTrials?: number` - Number of decode trials for verification (default: 1)

**Validation Rules**:
- `segments` must not be empty
- `targetImage` must be valid ImageData (width > 0, height > 0)
- `errorCorrectionLevel` must be 0, 1, 2, or 3
- `versionInfo.version` must be 1-40
- `minDecodeRedundancy` must be 0-1 (if provided)

**Relationships**:
- Uses `Segment[]` from input management
- Uses `QRBlock[]` from QR codeword generation
- Uses `QRMatrix` from QR matrix generation
- References `ImageData` from image transform pipeline

### QArtResult

**Purpose**: Result of QArt QR code generation

**Fields**:
- `matrix: QRMatrix` - Optimized QR code matrix
- `dataMask: number` - Data mask pattern used (always 0 for QArt)
- `segments: Segment[]` - Segments (may include QArt-added segments)
- `error: number` - Visual error between target image and QR code (0-1, lower is better)
- `decodeSuccessRate: number` - Decode verification success rate (0-1)
- `iterations: number` - Number of optimization iterations (currently 1)
- `controlMatrix?: QRMatrix` - Visualization matrix showing controlled modules (optional)

**Validation Rules**:
- `matrix` must be valid QRMatrix (dimension = version * 4 + 17)
- `dataMask` must be 0 (QArt uses mask pattern 0)
- `decodeSuccessRate` must be >= `minDecodeRedundancy` from options
- `error` must be >= 0

**State Transitions**:
- Created by `generateQArt(QArtOptions)` function
- `controlMatrix` is optional and only created if visualization is requested

### TargetGrid

**Purpose**: Rasterized representation of scaled target image mapped to QR code module positions

**Type**: `Float32Array` (size: `qrDimension * qrDimension`)

**Fields**:
- Each element represents brightness at QR module position (0 = black/dark, 1 = white/light)
- Index: `y * qrDimension + x` for module at position (x, y)

**Validation Rules**:
- Size must match QR code dimension: `length === qrDimension * qrDimension`
- Values must be 0-1 (brightness normalized)

**Relationships**:
- Created from `ImageData` via `rasterizeImageToQRGrid()`
- Used by `buildBitOrder()` for priority calculation
- Used by `optimizeBlock()` for image matching
- Used by `computeVisualError()` for error calculation

### ControlMatrix

**Purpose**: Visualization showing which modules were successfully controlled during optimization

**Type**: `QRMatrix` (same structure as QR code matrix)

**Fields**:
- Same structure as `QRMatrix`
- Modules marked to indicate control status (via `isDark` or custom property)

**Validation Rules**:
- Must have same dimension as result matrix
- Must be created from same QR code structure

**Relationships**:
- Created by `createControlMatrix(matrix, controlledBits)`
- Used for visualization in UI component

### BlockBasisState

**Purpose**: Reed-Solomon basis matrix state for controlling module values within a block

**Fields** (from `src/domain/qart/types.ts`):
- `B: Uint8ClampedArray` - Current data + EC bytes
- `M: Uint8ClampedArray[]` - Basis matrix: M[i] shows effect of flipping data bit i
- `savedM: Uint8ClampedArray[]` - Saved rows that have already been used
- `encoder: ReedSolomonEncoder` - Reed-Solomon encoder for this block
- `dataBytes: Uint8ClampedArray` - Reference to data bytes (will be updated)
- `ecBytes: Uint8ClampedArray` - Reference to EC bytes (will be updated)

**Validation Rules**:
- `B.length` must equal `dataBytes.length + ecBytes.length`
- `M.length` must equal number of controllable data bits
- Basis matrix must maintain Reed-Solomon correctness

**Relationships**:
- Created per block during optimization
- Used by `optimizeBlock()` for module control
- Encapsulates Reed-Solomon basis matrix operations

### PriorityFunction

**Purpose**: Function that determines module control order

**Types**:
- `"contrast"` - Contrast-based priority (prioritizes low-contrast regions)
- `"random"` - Random priority (uniform distribution)

**Implementation**:
- Contrast-based: Uses target grid contrast to prioritize modules
- Random: Uniform random ordering
- Implemented in `src/domain/qart/bitPriority.ts`

**Validation Rules**:
- Must be one of supported types
- Must produce valid bit order list

**Relationships**:
- Used by `buildBitOrder()` to create prioritized bit list
- Configurable via QArt options (future extension point)

### VersionCapacityCheck

**Purpose**: Validation that ensures selected QR version has sufficient capacity beyond user input for QArt generation

**Fields** (computed):
- `userInputBits: number` - Total bits from user inputs
- `versionCapacity: number` - Total capacity of selected version
- `availableCapacity: number` - `versionCapacity - userInputBits`
- `qartRequirement: number` - Required additional capacity for QArt (calculated dynamically)

**Validation Rules**:
- `availableCapacity` must be > 0 for QArt generation
- `qartRequirement` calculated based on image complexity and QR code size
- If `availableCapacity <= 0`, show warning (FR-015)

**Relationships**:
- Uses `VersionInfo` from QR version utilities
- Calculates requirement using image complexity metrics
- Used for version selection in Auto mode

## Extended Entities (Reused)

### Segment

**Purpose**: Data segment in QR code (reused from QR generation)

**Fields** (from `src/domain/shared/types.ts`):
- `value: number` - Segment value
- `length: number` - Segment length in bits
- `id: string` - Unique identifier
- `type?: string` - Segment type (e.g., "padding", "numeric", "alphanumeric")
- `bitIds?: string[]` - IDs of bits belonging to this segment

**QArt Extensions**:
- Padding segments (`type === "padding"`) are editable for QArt optimization
- QArt may add new segments if padding is insufficient (FR-005)

### QRBlock

**Purpose**: Reed-Solomon block containing data and error correction codewords (reused)

**Fields** (from `src/domain/qr/codewords/blocks.ts`):
- `data: Codeword[]` - Data codewords for this block
- `errorCorrection: Codeword[]` - Error correction codewords for this block

**QArt Extensions**:
- Blocks are processed independently during QArt optimization (FR-025)
- Deep copied before optimization to avoid mutation

### QRMatrix

**Purpose**: QR code matrix representation (reused)

**Type**: `QRModule[][]` (2D array)

**Fields** (from `src/domain/shared/types.ts`):
- Each module: `QRModule` with `id`, `bitId`, `bit`, `x`, `y`, `isDark`, `isMasked`, `type`, `nonData`, `source`

**QArt Extensions**:
- Modules marked as controlled in `controlMatrix`
- Only non-reserved modules (`nonData === false`) are controllable

## State Transitions

### QArt Generation Flow

1. **Input Validation**
   - Validate `QArtOptions` (segments, targetImage, versionInfo)
   - Check version capacity (FR-014)
   - If insufficient capacity, show warning (FR-015)

2. **Image Processing**
   - Scale image to fit QR dimensions (FR-003, FR-026)
   - Convert transparency to white background (FR-028)
   - Rasterize to QR grid (FR-004)
   - Check for extreme scaling, show warning if needed (FR-027)

3. **Block Optimization**
   - Deep copy blocks (avoid mutation)
   - For each block:
     - Build priority-ordered bit list
     - Optimize block using basis matrix
     - Track controlled bits

4. **Matrix Generation**
   - Rebuild codewords from optimized blocks
   - Generate final matrix with mask pattern 0 (FR-008)
   - Create control matrix visualization (FR-012)

5. **Validation**
   - Verify scannability (FR-009)
   - If fails, throw error (FR-010)
   - Calculate visual error

6. **Result Creation**
   - Create `QArtResult` with matrix, error, decode rate
   - Include control matrix if requested

### Cancellation Flow

1. **Input Change Detected**
   - Cancel current generation (AbortController)
   - Clear error state
   - Start new generation with updated inputs

2. **Cancellation Completion**
   - Must complete within 100ms (SC-010)
   - Clean up resources
   - Reset generation state

## Data Flow

```
User Inputs → Segments → Codewords → Blocks → Initial Matrix
                                                      ↓
Target Image → Transform → Scale → Rasterize → Target Grid
                                                      ↓
                                    QArt Optimization
                                                      ↓
                                    Optimized Blocks → Final Matrix
                                                      ↓
                                    Validation → QArtResult
```

## Validation Rules Summary

### Input Validation
- Segments must not be empty
- Target image must be valid ImageData
- Version must have sufficient capacity
- Error correction level must be valid (0-3)

### Generation Validation
- Decode success rate must be >= minDecodeRedundancy
- Matrix must be valid QR code structure
- Data mask must be 0 (QArt requirement)

### Capacity Validation
- Available capacity = version capacity - user input bits
- QArt requirement calculated dynamically
- If available capacity <= 0, show warning

## Relationships Diagram

```
QArtOptions
  ├── uses → Segment[]
  ├── uses → QRBlock[]
  ├── uses → QRMatrix
  └── uses → ImageData

QArtResult
  ├── contains → QRMatrix (optimized)
  ├── contains → Segment[] (may include QArt-added)
  └── optionally contains → QRMatrix (control visualization)

TargetGrid
  └── created from → ImageData

BlockBasisState
  └── used by → optimizeBlock()

PriorityFunction
  └── used by → buildBitOrder()

VersionCapacityCheck
  ├── uses → VersionInfo
  └── calculates → qartRequirement
```
