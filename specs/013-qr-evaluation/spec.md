# Feature Specification: Unified QR Code Evaluation

**Feature Branch**: `013-qr-evaluation`  
**Created**: 2026-08-16  
**Status**: Draft  
**Input**: Domain-layer evaluation API that composes existing quality measures into a comparable structured report

## User Scenarios & Testing

### User Story 1 - Evaluate any generated QR (Priority: P1)

As a developer, I need a single `evaluateGeneratedQr` entry point that runs every applicable quality measure on a generated artifact so I can compare generations without mode-specific ad-hoc checks.

**Why this priority**: Scattered metrics (decode rate, visual error, IS-QR PSNR, unused ISO evaluator) cannot be compared today.

**Independent Test**: Call `evaluateGeneratedQr` with a standard matrix + blocks; assert structure (mask penalty N1–N4), Reed-Solomon remaining budget, and scannability sections are present.

**Acceptance Scenarios**:

1. **Given** a matrix and blocks, **When** I evaluate, **Then** the report includes identity, structure (penalty breakdown), and Reed-Solomon remaining budget
2. **Given** a QArt result with target/contrast grids, **When** I evaluate, **Then** visual MAE, polarity agreement, and contrast-weighted error are present
3. **Given** a reference and fused image, **When** I evaluate, **Then** MSE/PSNR/SSIM/FSIM/GMSD are present
4. **Given** missing optional slices, **When** I evaluate, **Then** those sections are omitted rather than failing

### User Story 2 - Compare two reports (Priority: P1)

As a developer, I need `diffReports` to produce signed per-metric deltas (respecting higher/lower-better) so I can rank parameter choices.

**Independent Test**: Two reports differing in polarity agreement and penalty; deltas have correct signs.

### User Story 3 - Pipeline verify stage (Priority: P2)

As a developer, I need the generation pipeline to run a single `evaluate` verify node for all presets so every mode gets a comparable `Report`.

**Independent Test**: Run `qr` and `qart` presets; context has `evaluation`; illegal `evaluate` before `matrix` fails port validation.

### User Story 4 - Thin UI summary (Priority: P3)

As a user, I need quality metrics shown for QArt/combined and IS-QR from the same report shape.

**Independent Test**: EvaluationSummary renders metric list from an EvaluationReport.

## Non-Goals

- Combined opaque 0–100 quality score
- Comparison workspace UI / side-by-side history
- Module-level visual error heatmap UI
- New halftone coverage estimator (covered by recovery + weighted error)

## Requirements

- **FR-001**: System MUST expose `evaluateGeneratedQr(input, deps?)` returning `EvaluationReport` with typed metric sections
- **FR-002**: System MUST expose `diffReports(a, b)` with signed deltas per metric id
- **FR-003**: Decode MUST be injected via `EvaluateDeps` (domain stays canvas-free)
- **FR-004**: Mask penalty MUST report N1–N4 + total with ISO Rule 3 (1:1:3:1:1 + separators)
- **FR-005**: Reed-Solomon section MUST report per-block remaining correction budget
- **FR-006**: When rendered ImageData is present, system MUST support module recovery RS and post-render decode
- **FR-007**: Pipeline MUST replace separate `validateDecode`/`metrics` nodes with one `evaluate` node
- **FR-008**: Unused `qr/evaluator` JS MUST be removed after matrix-aware print metrics are ported
- **FR-009**: Existing `decodeSuccessRate` / `metrics` / `visualError` fields MAY remain as derived compatibility aliases

## Success Criteria

- **SC-001**: All presets that produce a matrix attach an `evaluation` report after verify
- **SC-002**: Existing QArt / IS-QR domain tests remain green after metrics move
- **SC-003**: Dead `qr/evaluator` tree is deleted; no callers of removed helpers remain
- **SC-004**: Two generations of the same payload can be ranked via `diffReports` without a single aggregate score
