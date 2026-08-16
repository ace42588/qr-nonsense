# Feature Specification: Embedded Dual-Payload QR Generation

**Feature Branch**: `011-embedded-qr-generation`  
**Created**: 2026-08-15  
**Status**: Implemented  
**Input**: Dual-payload Embed mode — Payload A in outer 8 of a 3×3 module grid, Payload B in the center cell

## User Scenarios & Testing

### User Story 1 - Generate Embedded QR (Priority: P1)

As a user, I need to embed a second payload in the centers of modules while Payload A fills the outer submodules, using existing 3×3 halftone rendering.

**Independent Test**: Enter Payload A and B, select Embed mode, verify each module is a 3×3 with outer cells matching A and center matching B.

**Acceptance Scenarios**:

1. **Given** two valid payloads, **When** I select Embed, **Then** modules render as 3×3 with outer=A and center=B
2. **Given** A and B agree on a module color, **When** rendered, **Then** all nine cells match that color
3. **Given** an encode error on either payload, **When** viewing Embed, **Then** the error is surfaced

### User Story 2 - Shared Dual Inputs (Priority: P1)

As a user, I reuse the same Payload A / B editors and shared format settings as Ambiguous mode.

## Non-Goals

- Image-driven pattern selection (this mode ignores uploaded images)
- Guaranteed that all scanners read A vs B predictably
- Stacking Embed with QArt / IS-QR

## Technical Notes

- Domain: `src/domain/dual/encodePair.ts`, `src/domain/embed/`
- Soft fusion: outer → Payload A polarity, center seed → Payload B (IS-QR-style); DWT/CSF post-process
- Rendering via fused `ImageData` + `renderHalftonePattern` legacy helper retained
- Same shared version / ECC / mask rules as Ambiguous
- UI: center dot size (`centerSeed`), polarity strength, CSF strength
