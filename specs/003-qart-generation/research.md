# Research: QArt QR Code Generation

**Feature**: 003-qart-generation  
**Date**: 2025-01-27  
**Status**: Complete

## Overview

This document consolidates research findings and technical decisions for implementing QArt QR code generation. All clarifications from the specification have been resolved through analysis of existing codebase and QArt algorithm research.

## Research Findings

### 1. QArt Algorithm Foundation

**Decision**: Use Reed-Solomon basis matrix approach as described in Russ Cox's QArt research.

**Rationale**: 
- Reed-Solomon encoding is systematic and closed under XOR operations
- Allows building a basis matrix to control which modules can be set while maintaining QR code correctness
- Existing implementation already follows this approach (`src/domain/qart/index.ts`)
- Reference: https://research.swtch.com/qart

**Alternatives considered**:
- Statistical optimization approaches: Rejected - less reliable, harder to guarantee correctness
- Direct module manipulation: Rejected - breaks Reed-Solomon error correction

### 2. Image Complexity Calculation for Capacity Requirements

**Decision**: Dynamic calculation based on image complexity metrics and QR code size.

**Rationale**:
- Image complexity can be measured using edge detection (Sobel operator) and brightness variance
- More complex images require more controllable modules for accurate representation
- QR code size (version) determines total available modules
- Formula: `additionalCapacity = baseCapacity + (imageComplexity * complexityFactor * qrSizeFactor)`

**Implementation approach**:
- Use `computeImportanceMap` function (already exists in `src/domain/image/index.ts`) to measure image complexity
- Calculate complexity score as variance of importance map values
- Base capacity: 50% of user input capacity
- Complexity factor: 0.1-0.3 multiplier based on complexity score
- QR size factor: 1.0 for versions 1-10, 1.2 for versions 11-20, 1.5 for versions 21+

**Alternatives considered**:
- Fixed capacity buffer: Rejected - doesn't adapt to image needs
- Percentage-based: Rejected - doesn't account for image complexity variations
- Version-dependent fixed: Rejected - ignores image characteristics

### 3. Image Scaling and Size Handling

**Decision**: Scale images to fit QR dimensions while preserving aspect ratio, with warnings for extreme cases.

**Rationale**:
- Preserves image proportions (FR-003, FR-004)
- Ensures images always fit QR grid dimensions
- Warnings help users understand potential quality issues
- Existing `calculateAppropriateImageScale` function handles this

**Implementation details**:
- Use `calculateAppropriateImageScale` from `src/domain/image/index.ts`
- Scale factor clamped to 0.1-10.0 range
- Warning threshold: scaling factor > 10x or < 0.1x (FR-027)
- Aspect ratio preserved automatically via divisive scaling

**Alternatives considered**:
- Reject out-of-range images: Rejected - poor UX, forces users to manually resize
- Silent scaling: Rejected - users need feedback about quality implications
- User choice (fit/fill/reject): Rejected - adds complexity, fit-with-warning is sufficient

### 4. Transparency and Alpha Channel Handling

**Decision**: Convert transparent areas to white background.

**Rationale**:
- QR codes are binary (dark/light), transparency has no meaning
- White background provides predictable base for QArt matching
- Matches typical QR code appearance expectations
- Can be handled during image transformation pipeline

**Implementation approach**:
- Process alpha channel during image transformation in `ImageTransformContext`
- Composite transparent pixels onto white background before rasterization
- Use canvas `globalCompositeOperation` or manual alpha blending

**Alternatives considered**:
- Preserve transparency: Rejected - QR codes don't support transparency
- Black background: Rejected - white is standard QR code background
- Reject transparent images: Rejected - poor UX, conversion is straightforward

### 5. Input Change Handling During Generation

**Decision**: Cancel current generation and start new one with updated inputs.

**Rationale**:
- Ensures users always see results for their latest inputs (FR-018, FR-019, FR-020)
- Prevents race conditions and stale results
- AbortController pattern already implemented in `QRCombined.jsx`
- Cancellation completes within 100ms (SC-010)

**Implementation approach**:
- Use AbortController for cancellation (already exists)
- Cancel on input change, image change, or parameter change
- Debounce rapid changes (300ms) to avoid excessive cancellation (FR-024)
- Clear error state when new generation starts

**Alternatives considered**:
- Continue current generation: Rejected - shows stale results, poor UX
- Queue new generation: Rejected - adds complexity, cancellation is simpler
- Warning dialog: Rejected - interrupts workflow, cancellation is transparent

### 6. Version Capacity Boundary Conditions

**Decision**: Treat exactly minimum capacity as insufficient capacity (show warning).

**Rationale**:
- Consistent with FR-015 behavior
- QArt requires additional capacity beyond user data
- Zero additional capacity means no room for optimization
- Clear user feedback about limitations

**Implementation approach**:
- Check: `availableCapacity = versionCapacity - userInputBits`
- If `availableCapacity <= 0`, show warning (FR-015)
- For Auto mode, select version where `availableCapacity > calculatedQArtRequirement`

**Alternatives considered**:
- Allow with reduced optimization: Rejected - inconsistent behavior, unclear to users
- Auto-upgrade version: Rejected - changes user's explicit version selection
- Allow but warn: Rejected - same as current decision, but "allow" implies it works when it doesn't

### 7. Priority Function Implementation

**Decision**: Support contrast-based and random priority functions (FR-007).

**Rationale**:
- Contrast-based prioritizes low-contrast regions (better visual matching)
- Random provides uniform distribution (alternative aesthetic)
- Both implemented in `src/domain/qart/bitPriority.ts`
- Extensible design allows adding new priority functions

**Implementation details**:
- Contrast-based: Uses target grid contrast to prioritize modules
- Random: Uniform random ordering
- Priority function selected via QArt options
- Builds bit order list before optimization

**Alternatives considered**:
- Single priority function: Rejected - limits user control and experimentation
- More complex priority functions: Deferred - can be added later without breaking changes

### 8. Block Processing Strategy

**Decision**: Process blocks independently for optimization (FR-025).

**Rationale**:
- Each block has its own Reed-Solomon error correction
- Independent processing enables parallelization (future optimization)
- Simpler error handling and state management
- Matches QArt algorithm design

**Implementation approach**:
- Iterate through blocks sequentially
- Each block optimized independently via `optimizeBlock`
- Controlled bits tracked per block, then merged
- Deep copy blocks to avoid mutation (already implemented)

**Alternatives considered**:
- Global optimization: Rejected - breaks Reed-Solomon block structure
- Inter-block dependencies: Rejected - adds complexity without clear benefit

### 9. Scannability Verification

**Decision**: Single pass/fail test using `validateDecode` function (FR-009).

**Rationale**:
- QR code either decodes correctly or it doesn't
- Statistical testing adds unnecessary complexity
- Existing `validateDecode` function in `src/domain/qr/index.ts`
- Minimum decode redundancy threshold: 0.8 (80% success rate)

**Implementation details**:
- Use `validateDecode(matrix, decodeTrials)` where `decodeTrials = 1`
- Throw error if decode success rate < minDecodeRedundancy (FR-010)
- Error message includes actual success rate for debugging

**Alternatives considered**:
- Statistical testing: Rejected - adds complexity, single test is sufficient
- Multiple decode attempts: Rejected - if it fails once, it's not scannable
- No verification: Rejected - violates scannability requirement

### 10. Control Matrix Visualization

**Decision**: Generate control matrix showing which modules were successfully controlled (FR-011, FR-012).

**Rationale**:
- Helps users understand QArt optimization process
- Visual feedback on optimization effectiveness
- Toggle-able view for detailed inspection
- Implemented via `createControlMatrix` function

**Implementation approach**:
- Track controlled bits during block optimization
- Create visualization matrix marking controlled modules
- Display as overlay or separate view
- Toggle via UI control (already in `QRQArt.jsx`)

**Alternatives considered**:
- No visualization: Rejected - reduces transparency and user understanding
- Statistical summary only: Rejected - visual representation is more intuitive

## Technical Dependencies

### Existing Infrastructure (Reused)
- QR code generation: `src/domain/qr/` (codewords, blocks, matrix, Reed-Solomon)
- Image processing: `src/domain/image/` (scaling, rasterization, transformation)
- State management: React Context API (`InputContext`, `QRDataContext`, `ImageTransformContext`)
- UI components: Radix UI components, custom message banners

### New Components Required
- Capacity calculation function: `calculateQArtCapacityRequirement(imageComplexity, qrSize, userInputBits)`
- Version capacity check: `checkVersionCapacityForQArt(versionInfo, userInputBits, qartRequirement)`
- Transparency handling: Alpha channel compositing in image transform pipeline
- Warning UI: Display capacity warnings and extreme scaling warnings

## Performance Considerations

- QArt generation is CPU-intensive (optimization loop)
- Image processing (scaling, rasterization) should be optimized
- Debouncing prevents excessive regeneration
- Cancellation must be fast (<100ms)
- Consider Web Workers for long-running generation (future optimization)

## Open Questions / Future Enhancements

1. **Parallel block processing**: Could blocks be optimized in parallel using Web Workers?
2. **Additional priority functions**: Could add gradient-based, importance-map-based priorities
3. **Progressive generation**: Could show partial results during long generation?
4. **Capacity calculation refinement**: Could tune complexity factors based on empirical testing

## References

- QArt Algorithm: https://research.swtch.com/qart
- QR Code Standard: ISO/IEC 18004
- Existing Implementation: `src/domain/qart/`
- Image Processing: `src/domain/image/`

