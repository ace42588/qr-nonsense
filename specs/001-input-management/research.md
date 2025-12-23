# Research: Input Management System

**Date**: 2025-01-27  
**Feature**: Input Management System  
**Status**: Complete

## Research Questions & Findings

### 1. State Management Architecture

**Question**: What state management pattern should be used for input management?

**Decision**: React Context + useReducer pattern

**Rationale**: 
- Provides centralized state management without external dependencies
- Supports complex state mutations through reducer actions
- Enables dependency tracking (MAC inputs referencing other inputs)
- Follows existing patterns in codebase (QRDataContext uses similar pattern)
- Type-safe with TypeScript action types

**Alternatives Considered**:
- **Zustand/Redux**: Adds external dependency; Context is sufficient for single-page app
- **useState**: Would require prop drilling; loses centralized state benefits
- **Jotai/Recoil**: Overkill for this use case; adds learning curve

**References**: Existing `src/state/qr/QRDataContext.tsx` pattern

---

### 2. Drag-and-Drop Library Selection

**Question**: Which library should be used for input reordering?

**Decision**: @dnd-kit library suite

**Rationale**:
- Modern, accessible drag-and-drop solution
- Already in dependencies (`@dnd-kit/core`, `@dnd-kit/sortable`)
- Supports keyboard navigation and screen readers
- Lightweight compared to react-beautiful-dnd
- TypeScript support

**Alternatives Considered**:
- **react-beautiful-dropdown**: Deprecated, no longer maintained
- **react-dnd**: More complex API, overkill for simple reordering
- **Custom implementation**: Would require significant accessibility work

**References**: Already used in `src/components/SortableInput.jsx`

---

### 3. Input Parsing Architecture

**Question**: How should different input types be parsed and encoded?

**Decision**: Parser map pattern with type-specific parser functions

**Rationale**:
- Each input type has distinct parsing logic (String vs JSON vs BitField vs MAC)
- Parser map allows easy extension (add new parser to map)
- Separation of concerns: each parser handles one responsibility
- Enables dependency resolution (MAC inputs parsed after non-MAC inputs)

**Alternatives Considered**:
- **Single parser with type switching**: Would violate Single Responsibility Principle
- **Class-based parsers**: Overkill for simple functions; adds complexity
- **Strategy pattern**: Similar to parser map but more verbose

**References**: `src/domain/input/index.js` INPUT_PARSERS pattern

---

### 4. MAC Dependency Handling

**Question**: How should MAC inputs handle deletion of referenced inputs?

**Decision**: Allow deletion; automatically recalculate MAC with remaining inputs

**Rationale**:
- User-friendly: doesn't block deletion
- Maintains data integrity: MAC always reflects current state
- Follows Tell Don't Ask: MAC recalculates itself rather than being queried
- Prevents broken state: MAC never references non-existent inputs

**Alternatives Considered**:
- **Prevent deletion**: Too restrictive; user should control inputs
- **Show error state**: Creates broken state that user must manually fix
- **Auto-delete MAC**: Loses user intent; MAC might still be valid with fewer inputs

**References**: Clarification session 2025-01-27

---

### 5. Error Handling Strategy

**Question**: How should encoding errors be displayed to users?

**Decision**: Inline errors in input card; disable QR generation

**Rationale**:
- Contextual: error appears where problem exists
- Prevents invalid QR codes: blocks generation until fixed
- Clear feedback: user knows exactly which input has issues
- Follows UX best practices: errors near source of problem

**Alternatives Considered**:
- **Toast notifications**: Errors disappear; no persistent feedback
- **Top banner**: Less contextual; harder to identify problem input
- **Allow generation with errors**: Would create invalid QR codes

**References**: Clarification session 2025-01-27

---

### 6. Empty Input Handling

**Question**: How should empty or null input values be handled?

**Decision**: Allow empty inputs; encode as empty segments

**Rationale**:
- Flexible: allows placeholders and optional data
- Preserves user intent: empty might be intentional
- QR code standard supports empty segments
- No data loss: user can add data later without recreating input

**Alternatives Considered**:
- **Prevent empty inputs**: Too restrictive; blocks valid use cases
- **Skip empty inputs**: Loses input order and structure
- **Show warning**: Adds noise; empty is valid state

**References**: Clarification session 2025-01-27

---

### 7. Long Content Display Strategy

**Question**: How should very long labels and data be displayed?

**Decision**: Truncate with ellipsis; show full content on hover/expand

**Rationale**:
- Maintains clean UI: prevents layout breaking
- Preserves access: full content still available
- Standard UX pattern: users expect truncation with expansion
- Performance: avoids rendering very long strings

**Alternatives Considered**:
- **No limit**: Would break UI layout with very long content
- **Hard limits**: Too restrictive; loses user data
- **Auto-resize**: Would make UI unpredictable

**References**: Clarification session 2025-01-27

---

### 8. Custom Encoding Strategies

**Question**: How should custom encoding strategies (ModHex, NTRUPrime) be implemented?

**Decision**: Pluggable encoder functions in domain/encoders/

**Rationale**:
- Separation of concerns: encoding logic separate from input parsing
- Extensible: new encoders can be added without modifying parsers
- Reusable: encoders can be used by multiple input types
- Testable: each encoder can be tested independently

**Alternatives Considered**:
- **Inline encoding**: Would duplicate logic across parsers
- **Class-based encoders**: Overkill for simple transformation functions
- **Single encoder with strategy parameter**: Less flexible; harder to extend

**References**: Existing `src/domain/encoders/modHex.js`, `src/domain/encoders/ntruPrime.js`

---

## Technology Decisions Summary

| Technology | Decision | Rationale |
|------------|----------|-----------|
| State Management | React Context + useReducer | Centralized, type-safe, follows existing patterns |
| Drag-and-Drop | @dnd-kit | Accessible, modern, already in dependencies |
| Parsing Architecture | Parser map pattern | Extensible, maintains Single Responsibility |
| Error Display | Inline in input card | Contextual, prevents invalid states |
| Empty Inputs | Allow and encode | Flexible, preserves user intent |
| Long Content | Truncate with expand | Maintains UI, preserves access |

## Open Questions

None - all technical decisions resolved through existing implementation analysis and clarification session.

## Next Steps

Proceed to Phase 1: Design & Contracts to document data model, API contracts, and create quickstart guide.

