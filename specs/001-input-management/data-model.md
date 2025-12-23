# Data Model: Input Management System

**Date**: 2025-01-27  
**Feature**: Input Management System

## Entities

### Input

Represents a single data input with type-specific configuration.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `label?: string` - User-defined label (default: "New Input")
- `type: string` - Input type: `"string" | "json" | "bitfield" | "mac"`
- `data: string` - Input data content (text for string, JSON string for json, etc.)
- `mode: string` - Encoding mode (for string inputs: `"numeric" | "alphanumeric" | "byte" | "eci"`)

**Type-Specific Fields**:

*String Input*:
- `encoding?: string` - ECI encoding identifier (if mode is "eci")

*JSON Input*:
- `obj?: any` - Parsed JSON object
- `schema?: any` - Serialization schema definition
- `schemaName?: string` - Name of predefined schema
- `encoding?: string` - Encoding strategy: `"Byte" | "Alphanumeric" | "String" | "PER-ModHex" | "PER-NTRU" | "None"`

*BitField Input*:
- `fields?: Field[]` - Array of bit field definitions
- `values?: Record<string, any>` - Field values keyed by field ID
- `layout?: any` - Bit layout structure (derived from schema or fields)

*MAC Input*:
- `algo?: string` - MAC algorithm name (e.g., `"Poly1305"`, `"HMAC-SHA256"`)
- `key?: string` - Cryptographic key for MAC generation
- `includedFields?: string[]` - Array of input IDs to include in MAC calculation

**Relationships**:
- MAC inputs reference other inputs via `includedFields` array
- Inputs are ordered in `InputState.inputs` array
- One input is active at a time (`InputState.activeInputID`)

**Validation Rules**:
- `id` must be unique within `InputState.inputs`
- `type` must be one of: `"string"`, `"json"`, `"bitfield"`, `"mac"`
- String inputs: `data` must match `mode` constraints (numeric: digits only, alphanumeric: allowed charset)
- JSON inputs: `obj` must be valid JSON when `encoding !== "None"`
- BitField inputs: `values` must not exceed field `bitWidth` constraints
- MAC inputs: `includedFields` must reference existing input IDs (validated on deletion)

**State Transitions**:
- Created → Active (when created, becomes active)
- Active → Inactive (when another input becomes active)
- Any → Deleted (when user deletes input)
- Type change: All type-specific fields reset to defaults for new type

---

### Field

Represents a BitField field definition.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `label?: string` - Field name/label
- `bitWidth?: number` - Number of bits for this field
- `type?: string` - Field data type
- `min?: number` - Minimum value (optional)
- `max?: number` - Maximum value (optional)
- `bits?: number` - Alias for `bitWidth`
- `startBit?: number` - Starting bit position (calculated)
- `endBit?: number` - Ending bit position (calculated)

**Relationships**:
- Belongs to BitField input via `Input.fields` array
- Ordered within `Input.fields` array determines bit layout

**Validation Rules**:
- `bitWidth` must be positive integer
- `bitWidth` must not cause total bit length to exceed QR code capacity
- Field values must fit within `bitWidth` bits

---

### InputState

Global state container for all inputs and format information.

**Fields**:
- `formatInfo: { errorCorrectionLevel: number, version: number, dataMask: number }` - QR code format settings
- `inputs: Input[]` - Ordered array of all inputs
- `activeInputID: string` - ID of currently active/editing input

**Invariants**:
- `inputs` array order determines encoding order
- `activeInputID` must reference an existing input ID (or null if no inputs)
- At least one input exists (initialized with default input)

**State Mutations** (via `InputAction`):
- `Add` - Append new input to `inputs` array
- `Remove` - Remove input from `inputs` array; if active, set new active to first input
- `Reorder` - Change order of inputs in array
- `Update` - Update input fields via partial update
- `SetInputType` - Change input type, resetting type-specific fields
- `SetActiveInput` - Change `activeInputID`
- Type-specific actions: `AddBitFieldField`, `UpdateJsonObject`, `SetMacAlgorithm`, etc.

---

### ParsedInput

Result of parsing an input, containing encoded data ready for QR code generation.

**Fields** (inferred from parser return):
- `mode: string` - QR code mode: `"numeric" | "alphanumeric" | "byte" | "kanji"`
- `data: number[]` - Encoded data as byte array
- `error?: string` - Error message if parsing failed
- `length?: number` - Data length in bits/bytes

**Relationships**:
- One ParsedInput per Input (1:1)
- Created by `parseAll(inputs)` function
- Used by QR code generation system

**Validation**:
- If `error` exists, QR code generation is blocked (FR-017a)
- `data` must fit within QR code capacity for selected version/error correction level

---

## Data Flow

1. **User creates/edits input** → `InputAction` dispatched → `inputReducer` updates `InputState`
2. **Input state changes** → `useParsedInputs` hook triggers → `parseAll(inputs)` called
3. **Parsing** → Type-specific parser processes input → Returns `ParsedInput`
4. **MAC dependency resolution** → Non-MAC inputs parsed first → MAC inputs parsed with resolved dependencies
5. **QR generation** → `ParsedInput[]` used to generate QR code segments → QR code matrix created

## Constraints

- Maximum inputs: No hard limit, but performance degrades beyond 10+ inputs (SC-001)
- Input data size: Up to 10KB per input (SC-006 for MAC generation)
- Total data capacity: Limited by QR code version/error correction level (FR-021)
- Input label length: No hard limit, but truncated in UI if >50 characters (FR-023)
- MAC dependencies: MAC inputs automatically recalculate when referenced inputs deleted (FR-015a)

## Type Definitions

See `src/types/index.ts` for complete TypeScript type definitions:
- `Input` interface
- `InputState` interface  
- `InputAction` interface
- `Field` interface

