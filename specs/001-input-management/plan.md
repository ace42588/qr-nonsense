# Implementation Plan: Input Management System

**Branch**: `001-input-management` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-input-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Comprehensive input management system supporting multiple input types (String, JSON, BitField, MAC) with drag-and-drop reordering, real-time parsing preview, and dependency handling. The system uses React Context + useReducer for state management, supports four input types with type-specific parsing logic, and provides inline error handling with QR code generation blocking when errors exist.

## Technical Context

**Language/Version**: TypeScript 5.8.3 (mixed JS/TS codebase, ES2020 target)  
**Primary Dependencies**: React 18.2.0, Vite 4.0.0+, Tailwind CSS 3.4.17, Radix UI components, @dnd-kit for drag-and-drop  
**Storage**: N/A (client-side only, in-memory state via React Context)  
**Testing**: Vitest 2.1.8, @testing-library/react 16.1.0, jsdom 25.0.1  
**Target Platform**: Web browser (modern browsers, >0.2% market share)  
**Project Type**: Single-page web application  
**Performance Goals**: 
- Input reordering: <100ms (SC-002)
- Input parsing preview updates: <200ms (SC-003)
- Input validation error display: <500ms (SC-005)
- MAC generation: <1s for inputs up to 10KB (SC-006)
- Support at least 10 inputs without performance degradation (SC-001)
**Constraints**: 
- Client-side only (no backend)
- Must handle empty/null inputs gracefully
- Must prevent QR generation when encoding errors exist
- Must handle input dependencies (MAC referencing other inputs)
- Must support real-time preview updates
**Scale/Scope**: 
- Single user application
- Up to 10+ inputs simultaneously
- Input data up to 10KB per input
- Real-time parsing and preview updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with QR-Nonsense Constitution principles:

- **DRY**: Does this feature introduce unnecessary code duplication? Can shared logic be extracted?
  - ✅ Input parsing logic is centralized in `domain/input/parsers/` with shared utilities
  - ✅ State management follows existing Context + reducer pattern
  - ✅ Input type-specific components share base InputCard structure
  - ⚠️ Need to verify: Are there duplicate validation/error handling patterns across input types?

- **SOLID**: Does the design follow Single Responsibility? Are dependencies properly inverted?
  - ✅ Each parser handles one input type (parseBasic, parseJson, parseBitField, generateMAC)
  - ✅ InputReducer handles state mutations only
  - ✅ InputContext provides state access only
  - ✅ InputFactory handles input creation logic
  - ✅ Dependencies flow from UI → Context → Reducer → Domain logic

- **TDA**: Are objects/modules encapsulating behavior, or are they being queried externally?
  - ✅ Input objects contain their own data; parsing logic operates on inputs
  - ✅ Reducer encapsulates state mutation logic
  - ⚠️ Need to verify: Are components querying input state to make decisions, or telling inputs what to do?

- **Flexibility**: Can this feature be extended without modifying existing code? Are interfaces abstract enough?
  - ✅ New input types can be added by adding parsers to INPUT_PARSERS map
  - ✅ Input type system uses discriminated unions for type safety
  - ✅ Encoding strategies are pluggable (ModHex, NTRUPrime, etc.)
  - ✅ MAC algorithms are extensible via MAC_FUNCTIONS map

- **Exploration**: If research/prototyping was done, is it documented? Are experimental approaches clearly marked?
  - ✅ Custom encoding strategies (ModHex, NTRUPrime) are documented in spec
  - ✅ Schema-based serialization approach documented

Any violations MUST be justified in Complexity Tracking section below.

## Project Structure

### Documentation (this feature)

```text
specs/001-input-management/
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
├── state/
│   └── inputs/
│       ├── InputContext.tsx      # React Context provider for input state
│       ├── inputReducer.ts       # Reducer for input state mutations
│       ├── inputActions.ts       # Action creators and action types
│       └── inputFactory.ts       # Factory for creating input instances
├── domain/
│   └── input/
│       ├── index.js              # Main parsing orchestration (parseAll)
│       ├── parsers/
│       │   ├── parseBasic.js     # String input parsing
│       │   ├── parseJson.js      # JSON input parsing with schema
│       │   ├── parseBitField.js  # BitField input parsing
│       │   ├── generateMAC.js   # MAC input generation
│       │   └── utils/
│       │       ├── macFunctions.js  # MAC algorithm implementations
│       │       └── bitFieldUtils.js  # BitField utilities
│       └── serializationSchemas.ts   # Predefined schemas
├── components/
│   ├── InputSidebar.jsx          # Sidebar container for inputs
│   ├── InputCard.jsx             # Base input card component
│   ├── SortableInput.jsx         # Drag-and-drop wrapper
│   └── input-types/
│       ├── StringInputCard.jsx   # String input UI
│       ├── JsonInputCard.jsx     # JSON input UI
│       ├── BitFieldInputCard.jsx # BitField input UI
│       └── MacInputCard.jsx      # MAC input UI
├── hooks/
│   └── useParsedInputs.ts       # Hook for accessing parsed inputs
└── types/
    └── index.ts                  # TypeScript type definitions
```

**Structure Decision**: Single-page web application structure. Input management is organized by concern: state management (`state/inputs/`), domain logic (`domain/input/`), UI components (`components/`), and type definitions (`types/`). This follows the existing project structure and maintains separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Mixed JS/TS codebase | Gradual migration strategy | Full TypeScript migration would require rewriting all domain logic simultaneously, increasing risk |
| Context + Reducer pattern | Complex state with multiple action types | Simple useState would require prop drilling and lose centralized state management benefits |
| Multiple parser modules | Different parsing logic per input type | Single parser would violate Single Responsibility and become unmaintainable |

## Phase 0: Research Complete

**Status**: ✅ Complete  
**Output**: `research.md`  
**Findings**: All technical decisions resolved. State management uses React Context + useReducer. Drag-and-drop via @dnd-kit. Parser map pattern for extensibility. MAC dependency handling clarified: allow deletion with automatic recalculation. Error handling: inline errors in input cards. Empty inputs allowed and encoded. Long content truncated with expand option.

## Phase 1: Design Complete

**Status**: ✅ Complete  
**Outputs**:
- `data-model.md` - Entity definitions (Input, Field, InputState, ParsedInput), relationships, validation rules, state transitions
- `contracts/component-api.ts` - React component API contracts (InputProvider, useInputs, InputCard, etc.)
- `contracts/domain-api.ts` - Domain logic API contracts (parseAll, InputParser, MAC algorithms, encoders)
- `quickstart.md` - Developer quickstart guide with examples for all input types

**Key Design Decisions**:
- Input state managed via React Context + useReducer pattern
- Parser map pattern allows easy extension of input types
- Two-pass parsing: non-MAC inputs first, then MAC inputs with resolved dependencies
- Inline error display prevents invalid QR code generation
- Empty inputs encoded as empty segments (flexible user workflow)
- MAC inputs automatically recalculate when referenced inputs deleted

## Phase 2: Implementation Planning

**Status**: Ready for `/speckit.tasks`  
**Next Steps**: Break plan into implementation tasks

