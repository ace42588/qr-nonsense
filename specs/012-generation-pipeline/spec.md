# Feature Specification: Generation Pipeline Foundation

**Feature Branch**: `012-generation-pipeline`  
**Created**: 2026-08-16  
**Status**: Implemented  
**Input**: Domain-layer generation graph — stage functions, GenerationContext, node catalog, and preset graphs for existing QR modes

## User Scenarios & Testing

### User Story 1 - Preset graphs match current modes (Priority: P1)

As a developer, I need each App `qrType` (qr, hqr, qart, combined, isqr, ambiguous, embed) represented as a linear preset graph so modes are data, not hard-coded orchestration.

**Why this priority**: Unlocks composing operations without rewriting UI.

**Independent Test**: Run each preset via `runGraph` with a tiny payload and verify it completes (image modes with a small ImageData; decode mocked).

**Acceptance Scenarios**:

1. **Given** inputs and format, **When** I run preset `qr`, **Then** context has segments, codewords, blocks, and matrix matching the classic encode path
2. **Given** QArt options already encoded, **When** `generateQArt` runs, **Then** it uses stage functions / pipeline and returns the same shape as before
3. **Given** an illegal node order (e.g. halftone before matrix), **When** ports are validated, **Then** the runner rejects before executing

### User Story 2 - GenerationContext preserves bit identity (Priority: P1)

As a developer, I need segments, codewords, blocks, and matrix to travel as one context so bit UUIDs stay aligned for highlighting, QArt, and damage.

**Why this priority**: Broken identity breaks visualization and optimization.

**Independent Test**: After `qr` preset, matrix module bit ids intersect segment.bitIds.

### User Story 3 - Catalog documents reusable nodes (Priority: P2)

As a developer, I need a typed node catalog (ports + stage) wrapping existing domain exports so a future graph editor can wire them.

**Why this priority**: Catalog is the contract for UI later; no canvas in this feature.

**Acceptance Scenarios**:

1. Catalog includes encode, QArt, IS-QR, dual, halftone intent, damage, and validateDecode nodes
2. Optional `qartAppend` still runs when append is disabled (deep-copies blocks; no-op append) so QArt never mutates shared UI blocks

## Non-Goals

- Node-RED / DaVinci-style canvas UI
- Switching App mode toggle to load presets by id (catalog ready; UI still uses `qrType`)
- Free-form DAG / dirty-node cache beyond AbortSignal threading
- Custom user graphs in the product UI

## Requirements

- **FR-001**: System MUST expose `GenerationContext` with optional encode, dual, image, QArt, render, and report slices
- **FR-002**: System MUST provide stage wrappers for encode, codewords, matrix, and QArt stages
- **FR-003**: System MUST provide a node catalog with declared `in`/`out` ports
- **FR-004**: System MUST provide linear `runGraph(presetId | nodeIds[], ctx)` with port checks and abort
- **FR-005**: System MUST define presets for qr, hqr, qart, combined, isqr, ambiguous, embed
- **FR-006**: Existing `generateQArt` / `generateIsqr` / dual generate APIs MUST remain callable with prior signatures

## Success Criteria

- **SC-001**: `qr` preset output matches classic `getEncodedMessage` + `getCodewords` + `getMatrix` on the same input
- **SC-002**: Existing QArt / IS-QR / ambiguous / embed domain tests remain green
- **SC-003**: Illegal sequences fail port validation before node `run`
