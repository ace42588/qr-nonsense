# Implementation Plan: QArt QR Code Generation

**Branch**: `003-qart-generation` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-qart-generation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

QArt-style QR code generation that embeds images while maintaining scannability. The system uses Reed-Solomon basis matrices to control module values while preserving QR code correctness, processes blocks independently, and provides visualization of controlled modules. Image processing includes scaling, transparency handling, and rasterization to QR grid dimensions.

## Technical Context

**Language/Version**: TypeScript 5.8.3 (mixed JS/TS codebase, ES2020 target)  
**Primary Dependencies**: React 18.2.0, Vite 4.0.0+, Tailwind CSS 3.4.17, Radix UI components  
**Storage**: N/A (client-side only, in-memory state)  
**Testing**: Vitest 2.1.8, @testing-library/react 16.1.0, jsdom 25.0.1  
**Target Platform**: Web browser (modern browsers, >0.2% market share)  
**Project Type**: Single-page web application  
**Performance Goals**: 
- QArt generation: <5s for version 10, <30s for version 20
- Image scaling: <200ms for images up to 10MP
- Image rasterization: <100ms for QR codes up to version 20
- Version capacity check: <50ms
- Scannability verification: <500ms
- Debouncing: max 1 regeneration per 300ms
**Constraints**: 
- Client-side only (no backend)
- Must maintain QR code scannability (95%+ pass rate)
- Must handle cancellation gracefully (<100ms cancellation time)
- Must preserve aspect ratio during image rasterization
**Scale/Scope**: 
- Single user application
- QR codes up to version 20 (177x177 modules)
- Images up to 10MP
- Real-time generation with debouncing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with QR-Nonsense Constitution principles:

- **DRY**: Does this feature introduce unnecessary code duplication? Can shared logic be extracted?
  - ✅ QArt generation reuses existing QR code infrastructure (codewords, blocks, matrix generation)
  - ✅ Image processing logic is shared via `domain/image` module
  - ✅ State management follows existing Context patterns
  - ⚠️ Need to verify: Are there duplicate image scaling/rasterization implementations?

- **SOLID**: Does the design follow Single Responsibility? Are dependencies properly inverted?
  - ✅ QArt domain logic separated from UI components (`domain/qart` vs `components/QRQArt`)
  - ✅ Image transform state separated into `ImageTransformContext`
  - ✅ Block optimization is independent per block (FR-025)
  - ✅ Need to verify: Are interfaces abstract enough for extensibility?

- **TDA**: Are objects/modules encapsulating behavior, or are they being queried externally?
  - ✅ QArt generation function encapsulates optimization logic
  - ✅ Blocks handle their own optimization via `optimizeBlock`
  - ✅ Image transform context encapsulates transform state
  - ⚠️ Need to verify: Are there external queries of internal state that violate TDA?

- **Flexibility**: Can this feature be extended without modifying existing code? Are interfaces abstract enough?
  - ✅ Priority function is configurable (contrast-based or random)
  - ✅ QArt options interface allows extension
  - ⚠️ Need to verify: Can new priority functions be added without modifying core code?
  - ⚠️ Need to verify: Is capacity calculation extensible for different strategies?

- **Exploration**: If research/prototyping was done, is it documented? Are experimental approaches clearly marked?
  - ✅ QArt algorithm references Russ Cox research (https://research.swtch.com/qart)
  - ⚠️ Need to verify: Are experimental capacity calculation strategies documented?

Any violations MUST be justified in Complexity Tracking section below.

## Project Structure

### Documentation (this feature)

```text
specs/003-qart-generation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── App.tsx            # Root component (already includes QRQArt)
├── components/
│   ├── QRQArt.jsx         # QArt QR code component (EXISTS - needs enhancement)
│   ├── QRCombined.jsx     # Combined mode component (EXISTS - uses QArt)
│   └── ui/
│       ├── image-transform-controls.jsx  # Image transform UI (EXISTS)
│       ├── image-upload-controls.jsx     # Image upload UI (EXISTS)
│       └── message-banner.jsx           # Error/loading banners (EXISTS)
├── domain/
│   ├── qart/              # QArt generation domain logic (EXISTS - needs enhancement)
│   │   ├── index.ts       # Main QArt generation function (EXISTS)
│   │   ├── basisMatrix.ts # Reed-Solomon basis matrix (EXISTS)
│   │   ├── bitPriority.ts # Priority function implementations (EXISTS)
│   │   ├── blockOptimizer.ts # Block optimization logic (EXISTS)
│   │   ├── codewordConversion.ts # Codeword utilities (EXISTS)
│   │   ├── controlMatrix.ts # Control matrix generation (EXISTS)
│   │   └── types.ts       # QArt types (EXISTS)
│   ├── image/             # Image processing (EXISTS)
│   │   ├── index.ts       # Image utilities (EXISTS)
│   │   └── transform.ts   # Image transformation (EXISTS)
│   └── qr/                # Core QR code logic (EXISTS - reused)
│       ├── codewords/     # Codeword generation (EXISTS - reused)
│       ├── matrix/        # Matrix generation (EXISTS - reused)
│       └── reedsolomon/   # Reed-Solomon error correction (EXISTS - reused)
├── state/
│   ├── image/             # Image transform state (EXISTS)
│   │   └── ImageTransformContext.tsx
│   ├── inputs/            # Input management state (EXISTS - reused)
│   └── qr/                # QR code state (EXISTS - reused)
└── hooks/
    ├── useImageLoader.js  # Image loading hook (EXISTS)
    ├── useImageUpload.js  # Image upload hook (EXISTS)
    └── useModuleHover.js  # Module hover visualization (EXISTS)
```

**Structure Decision**: Single-page React application with domain-driven design. QArt feature extends existing QR code generation infrastructure. Image processing is shared via `domain/image` module. State management uses React Context API following existing patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Phase 0: Research Complete

**Status**: ✅ Complete  
**Output**: `research.md`  
**Findings**: All clarifications resolved. QArt algorithm uses Reed-Solomon basis matrices. Capacity calculation is dynamic based on image complexity. Image handling (scaling, transparency) clarified.

## Phase 1: Design Complete

**Status**: ✅ Complete  
**Outputs**:
- `data-model.md` - Entity definitions, relationships, validation rules, state transitions
- `contracts/qart-generation.ts` - QArt generation function contracts
- `contracts/image-processing.ts` - Image processing function contracts  
- `contracts/component-api.ts` - React component API contracts
- `quickstart.md` - Developer quickstart guide
- `.cursor/rules/specify-rules.mdc` - Agent context updated

**Key Design Decisions**:
- Reuse existing QR code infrastructure (codewords, blocks, matrix)
- Independent block processing for optimization
- Dynamic capacity calculation based on image complexity
- AbortController pattern for cancellation
- 300ms debouncing for parameter changes

## Phase 2: Implementation Planning

**Status**: Ready for `/speckit.tasks`  
**Next Steps**: Break plan into implementation tasks

