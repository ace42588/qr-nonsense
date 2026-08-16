# Feature Specification: Ambiguous QR Generation

**Feature Branch**: `010-ambiguous-qr-generation`  
**Created**: 2026-08-15  
**Status**: Implemented  
**Input**: Dual-payload Ambiguous mode — two QR matrices composited with 2×2 checkered modules where bits differ

## User Scenarios & Testing

### User Story 1 - Generate Ambiguous QR (Priority: P1)

As a user, I need to encode two independent payloads into one image so a slight sampling shift can yield either read.

**Independent Test**: Enter Payload A and Payload B, select Ambiguous mode, verify modules that differ are 2×2 checkered and agreeing modules are solid.

**Acceptance Scenarios**:

1. **Given** two valid payloads and shared format settings, **When** I select Ambiguous, **Then** a composite QR renders with checkered differing modules
2. **Given** identical bits at a module, **When** rendered, **Then** that module is solid black or white
3. **Given** an encode error on either payload, **When** viewing Ambiguous, **Then** the error is surfaced

### User Story 2 - Configure Payload A / B (Priority: P1)

As a user, I need full input editors for both payloads while sharing version, ECC, and mask.

**Acceptance Scenarios**:

1. Switching the A/B payload toggle edits the corresponding input list
2. Format controls (version / ECC / mask) apply to both encodings
3. Non-Ambiguous modes continue to use Payload A only

### User Story 3 - Checker Phase (Priority: P2)

As a user, I can flip which checkerboard diagonal belongs to Payload A.

## Non-Goals

- Guaranteed dual decode on all scanner apps/hardware
- Stacking Ambiguous with QArt / halftone / IS-QR
- Different QR versions per payload

## Technical Notes

- Domain: `src/domain/dual/encodePair.ts`, `src/domain/ambiguous/`
- Differing modules: 2×2 checker (A on main diagonal by default); center sits on quadrant cross
- Auto version = `max(requiredA, requiredB)`; auto mask resolved from A then forced onto B
