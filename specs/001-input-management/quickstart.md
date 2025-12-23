# Quickstart: Input Management System

**Date**: 2025-01-27  
**Feature**: Input Management System

This guide provides a quick introduction to using and extending the input management system.

## Overview

The input management system allows users to create, edit, reorder, and delete multiple inputs of different types (String, JSON, BitField, MAC) that are then parsed and encoded into QR codes.

## Architecture

```
┌─────────────────┐
│   UI Components │  (InputCard, InputSidebar, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Context   │  (InputContext, useInputs hook)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Reducer        │  (inputReducer, inputActions)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Domain Logic    │  (parseAll, parsers, encoders)
└─────────────────┘
```

## Basic Usage

### 1. Setting Up Input Provider

Wrap your app with `InputProvider` to enable input management:

```tsx
import { InputProvider } from "@/state/inputs/InputContext";

function App() {
  return (
    <InputProvider>
      <YourComponents />
    </InputProvider>
  );
}
```

### 2. Accessing Input State

Use the `useInputs` hook to access state and dispatch actions:

```tsx
import { useInputs } from "@/state/inputs/InputContext";
import { addInput, removeInput, updateInput } from "@/state/inputs/inputActions";

function MyComponent() {
  const { state, dispatch } = useInputs();
  
  const handleAdd = () => {
    dispatch(addInput("New Input"));
  };
  
  const handleDelete = (id: string) => {
    dispatch(removeInput(id));
  };
  
  return (
    <div>
      {state.inputs.map(input => (
        <div key={input.id}>{input.label}</div>
      ))}
    </div>
  );
}
```

### 3. Getting Parsed Inputs

Use `useParsedInputs` hook to get parsed inputs ready for QR generation:

```tsx
import { useParsedInputs } from "@/hooks/useParsedInputs";

function QRGenerator() {
  const parsedInputs = useParsedInputs();
  
  // parsedInputs contains ParsedInput[] ready for QR code generation
  // Automatically updates when inputs change
}
```

## Input Types

### String Input

String inputs support multiple encoding modes:

```tsx
// Create string input
dispatch(addInput("My String"));
dispatch(setInputType(inputId, "string"));

// Update string input
dispatch(updateInput(inputId, {
  data: "Hello World",
  mode: "byte" // or "numeric", "alphanumeric", "eci"
}));
```

**Modes**:
- `numeric`: Only digits (0-9)
- `alphanumeric`: Uppercase letters, digits, and special chars ($%*+-./:)
- `byte`: UTF-8 encoding, any characters
- `eci`: Extended Channel Interpretation with custom encoding

### JSON Input

JSON inputs support schema-based serialization:

```tsx
// Create JSON input
dispatch(addInput("My JSON"));
dispatch(setInputType(inputId, "json"));

// Update JSON input
dispatch(updateJsonObject(inputId, {
  p: "A",
  cc: 133,
  txn: "99999"
}));

// Set schema and encoding
dispatch(updateSchema(inputId, jsonSchema));
dispatch(updateEncoding(inputId, "PER-ModHex"));
```

**Encoding Strategies**:
- `Byte`: Raw byte encoding
- `Alphanumeric`: Alphanumeric QR mode
- `String`: String representation
- `PER-ModHex`: ModHex character set (CBDEFGHIJKLNRTUV)
- `PER-NTRU`: NTRUPrime decimal encoding
- `None`: No encoding (raw data)

### BitField Input

BitField inputs allow precise bit-level control:

```tsx
// Create BitField input
dispatch(addInput("My BitField"));
dispatch(setInputType(inputId, "bitfield"));

// Add field
dispatch(addBitFieldField(inputId, {
  label: "Version",
  bitWidth: 4
}));

// Set field values
dispatch(setBitFieldValues(inputId, {
  [fieldId]: 5 // Value for field
}));

// Reorder fields
dispatch(reorderBitFieldFields(inputId, oldIndex, newIndex));
```

### MAC Input

MAC inputs generate cryptographic authentication codes:

```tsx
// Create MAC input
dispatch(addInput("My MAC"));
dispatch(setInputType(inputId, "mac"));

// Configure MAC
dispatch(setMacAlgorithm(inputId, "Poly1305"));
dispatch(setMacKey(inputId, "secret-key"));
dispatch(setIncludedFields(inputId, [input1Id, input2Id])); // Reference other inputs
```

**MAC Algorithms**:
- `Poly1305`: Poly1305 MAC
- `HMAC-SHA256`: HMAC with SHA-256
- (Extensible via MAC_FUNCTIONS registry)

## Common Operations

### Reordering Inputs

```tsx
import { reorderInput } from "@/state/inputs/inputActions";

// Reorder input from oldIndex to newIndex
dispatch(reorderInput(oldIndex, newIndex));
```

Uses `@dnd-kit` for drag-and-drop in UI.

### Changing Input Type

```tsx
import { setInputType } from "@/state/inputs/inputActions";

// Change input type (resets type-specific fields to defaults)
dispatch(setInputType(inputId, "json"));
```

### Handling Errors

Inputs with parsing errors block QR generation:

```tsx
const parsedInputs = useParsedInputs();

// Check for errors
const hasErrors = parsedInputs.some(p => p.error);

// Display errors inline in input card
{parsedInputs.map(parsed => (
  parsed.error && <ErrorDisplay message={parsed.error} />
))}
```

### Empty Input Handling

Empty inputs are allowed and encoded as empty segments:

```tsx
// Empty input is valid
dispatch(updateInput(inputId, { data: "" }));
// Will encode as empty segment in QR code
```

### MAC Dependency Handling

When a referenced input is deleted, MAC automatically recalculates:

```tsx
// MAC input references input1 and input2
dispatch(setIncludedFields(macInputId, [input1Id, input2Id]));

// Delete input1
dispatch(removeInput(input1Id));

// MAC automatically recalculates with only input2
// No manual intervention needed
```

## Extending the System

### Adding a New Input Type

1. **Create Parser** (`src/domain/input/parsers/parseNewType.js`):

```javascript
export function parseNewType(input) {
  // Parse input and return ParsedInput
  return {
    mode: "byte",
    data: [...], // Encoded data
    length: data.length * 8
  };
}
```

2. **Register Parser** (`src/domain/input/index.js`):

```javascript
import { parseNewType } from "./parsers/parseNewType";

const INPUT_PARSERS = {
  // ... existing parsers
  newtype: parseNewType,
};
```

3. **Add Type Defaults** (`src/state/inputs/inputFactory.ts`):

```typescript
const inputTypeDefaults: InputTypeDefaults = {
  // ... existing types
  newtype: {
    type: "newtype",
    // ... type-specific defaults
  },
};
```

4. **Create UI Component** (`src/components/input-types/NewTypeInputCard.jsx`):

```tsx
export function NewTypeInputCard({ input, onUpdate, ...props }) {
  // UI for new input type
}
```

### Adding a New MAC Algorithm

1. **Implement Algorithm** (`src/domain/input/parsers/utils/macFunctions.js`):

```javascript
export function myMacAlgorithm(data, key) {
  // Implement MAC algorithm
  return macValue;
}

export const MAC_FUNCTIONS = {
  // ... existing algorithms
  "MyMAC": myMacAlgorithm,
};
```

### Adding a New Encoding Strategy

1. **Implement Encoder** (`src/domain/encoders/myEncoder.js`):

```javascript
export function myEncoder(data) {
  // Convert Uint8Array to encoded string
  return encodedString;
}
```

2. **Use in Parser**: Reference encoder in JSON parser or other parsers as needed.

## Performance Considerations

- **Input Limit**: System supports 10+ inputs without degradation (SC-001)
- **Parsing Speed**: Preview updates in <200ms (SC-003)
- **MAC Generation**: Completes in <1s for inputs up to 10KB (SC-006)
- **Reordering**: Completes in <100ms (SC-002)

## Error Handling

- **Parsing Errors**: Returned in `ParsedInput.error` field
- **Validation Errors**: Displayed inline in input card
- **QR Generation**: Blocked when any input has errors (FR-017a)
- **Capacity Errors**: Warning shown when data exceeds QR capacity (FR-021)

## Testing

Example test for input creation:

```typescript
import { renderHook, act } from "@testing-library/react";
import { InputProvider, useInputs } from "@/state/inputs/InputContext";
import { addInput } from "@/state/inputs/inputActions";

test("creates input", () => {
  const wrapper = ({ children }) => <InputProvider>{children}</InputProvider>;
  const { result } = renderHook(() => useInputs(), { wrapper });
  
  act(() => {
    result.current.dispatch(addInput("Test Input"));
  });
  
  expect(result.current.state.inputs).toHaveLength(2); // 1 default + 1 new
});
```

## Related Documentation

- [Data Model](./data-model.md) - Entity definitions and relationships
- [Component API](./contracts/component-api.ts) - Component interfaces
- [Domain API](./contracts/domain-api.ts) - Domain logic interfaces
- [Specification](./spec.md) - Complete feature specification

