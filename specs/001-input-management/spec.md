# Feature Specification: Input Management System

**Feature Branch**: `001-input-management`  
**Created**: 2025-01-27  
**Status**: Complete  
**Input**: User description: "Comprehensive input management system supporting multiple input types and formats"

## Clarifications

### Session 2025-01-27

- Q: When a MAC input references other inputs and one of those referenced inputs is deleted, what should happen? → A: Allow deletion; recalculate the MAC with the remaining inputs
- Q: How should the system handle inputs with empty or null values? → A: Allow empty inputs; encode as empty segments in QR code
- Q: When the total input data exceeds QR code capacity, what should happen? → A: Show warning; allow user to choose truncate or upgrade version
- Q: When encoding errors occur, how should errors be displayed to users? → A: Show inline error in input card; disable QR generation
- Q: How should the system handle very long input labels or data values? → A: Truncate display with ellipsis; show full content on hover/expand

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Manage Multiple Inputs (Priority: P1)

As a user, I need to create multiple inputs with different types (String, JSON, BitField, MAC) so I can encode complex data into QR codes.

**Why this priority**: This is the core functionality for data entry - without inputs, no QR codes can be generated.

**Independent Test**: Can be fully tested by creating inputs of each type, editing their content, and verifying they appear in the input sidebar and are processed correctly.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** I click the add input button, **Then** a new input is created with a default label and type
2. **Given** I have multiple inputs, **When** I drag an input to reorder it, **Then** the input order changes and QR code generation reflects the new order
3. **Given** I have an input, **When** I rename it, **Then** the label updates in the sidebar and throughout the application
4. **Given** I have an input, **When** I delete it, **Then** it is removed from the sidebar and QR code generation

---

### User Story 2 - String Input with Mode Selection (Priority: P1)

As a user, I need to enter text data and select the appropriate QR code encoding mode (numeric, alphanumeric, byte) so the data is encoded efficiently.

**Why this priority**: String input is the most common use case and must support all standard QR code modes.

**Independent Test**: Can be fully tested by entering text, selecting different modes, and verifying the QR code encodes correctly with the chosen mode.

**Acceptance Scenarios**:

1. **Given** I have a string input, **When** I enter numeric text and select numeric mode, **Then** only digits are allowed and the mode indicator updates
2. **Given** I have a string input, **When** I enter alphanumeric text and select alphanumeric mode, **Then** only allowed characters are accepted and text is uppercased
3. **Given** I have a string input, **When** I enter arbitrary text and select byte mode, **Then** all characters are accepted and encoded as UTF-8 bytes
4. **Given** I switch modes, **When** the current text doesn't match the new mode, **Then** the text is automatically filtered to match the mode constraints

---

### User Story 3 - JSON Input with Schema Serialization (Priority: P2)

As a user, I need to enter structured JSON data with a schema so it can be serialized into QR code format according to the schema definition.

**Why this priority**: Enables encoding of structured data with custom serialization formats.

**Independent Test**: Can be fully tested by entering JSON, defining a schema, selecting encoding, and verifying serialization output.

**Acceptance Scenarios**:

1. **Given** I have a JSON input, **When** I enter valid JSON and a schema, **Then** the data is validated and serialized according to the schema
2. **Given** I have a JSON input, **When** I select an encoding (Byte, Alphanumeric, String, PER-ModHex, PER-NTRU), **Then** the serialized output uses the selected encoding format
3. **Given** I have a JSON input, **When** I enter invalid JSON, **Then** an error is displayed and the input is not processed
4. **Given** I have a JSON input with auto-detection, **When** no encoding is selected, **Then** the system auto-detects encoding from schema structure
5. **Given** I select PER-ModHex encoding, **When** the data is serialized, **Then** binary data is encoded using ModHex character set (CBDEFGHIJKLNRTUV) and uses alphanumeric QR mode
6. **Given** I select PER-NTRU encoding, **When** the data is serialized, **Then** binary data is encoded as decimal digits using NTRUPrime algorithm and uses numeric QR mode

---

### User Story 4 - BitField Input with Field Definitions (Priority: P2)

As a user, I need to define bit fields and set their values so I can create QR codes with precise binary data layouts.

**Why this priority**: Enables encoding of binary data with specific bit-level control.

**Independent Test**: Can be fully tested by defining fields, setting values, and verifying the bit layout matches expectations.

**Acceptance Scenarios**:

1. **Given** I have a BitField input, **When** I add a field with name, bit length, and value, **Then** the field is added to the bitfield definition
2. **Given** I have BitField fields defined, **When** I set field values, **Then** the total bit length is calculated and displayed
3. **Given** I have BitField fields, **When** values exceed field bit capacity, **Then** an error is shown and the value is clamped or rejected
4. **Given** I have BitField fields, **When** I reorder fields, **Then** the bit layout reflects the new order

---

### User Story 5 - MAC Input with Cryptographic Operations (Priority: P2)

As a user, I need to generate Message Authentication Codes (MACs) for inputs using cryptographic functions so I can create authenticated QR code payloads.

**Why this priority**: Enables creation of authenticated QR codes with cryptographic integrity.

**Independent Test**: Can be fully tested by selecting inputs, choosing MAC algorithm, and verifying MAC generation and inclusion in QR code.

**Acceptance Scenarios**:

1. **Given** I have a MAC input, **When** I select source inputs and a MAC algorithm, **Then** a MAC is generated from the selected inputs
2. **Given** I have a MAC input, **When** I change source inputs, **Then** the MAC is recalculated automatically
3. **Given** I have a MAC input, **When** I select different MAC algorithms, **Then** the MAC value changes appropriately
4. **Given** I have a MAC input, **When** I include the MAC in the QR code, **Then** it appears as a separate segment in the encoded data
5. **Given** I have a MAC input referencing multiple inputs, **When** I delete one of the referenced inputs, **Then** the MAC is automatically recalculated using only the remaining referenced inputs

---

### User Story 6 - Input Parsing and Preview (Priority: P2)

As a user, I need to see a preview of how my input will be parsed and encoded so I can verify correctness before generating the QR code.

**Why this priority**: Provides immediate feedback and helps users understand how their data will be encoded.

**Independent Test**: Can be fully tested by entering data and verifying the preview shows correct parsed output.

**Acceptance Scenarios**:

1. **Given** I have an input with data, **When** I view the input card, **Then** a preview shows the parsed/encoded output
2. **Given** I modify input data, **When** the preview updates, **Then** it reflects the changes immediately
3. **Given** I have an invalid input, **When** I view the preview, **Then** error messages are displayed clearly

---

### Edge Cases

- ~~What happens when an input is deleted while it's being referenced by another input (e.g., MAC input)?~~ **Resolved**: When a referenced input is deleted, MAC inputs automatically recalculate using only the remaining referenced inputs.
- ~~How does the system handle inputs with empty or null values?~~ **Resolved**: Empty inputs are allowed and encoded as empty segments in the QR code.
- ~~What happens when input data exceeds QR code capacity?~~ **Resolved**: System shows a warning and allows user to choose between truncating data or upgrading QR version (if available).
- ~~How are encoding errors handled and displayed to users?~~ **Resolved**: Encoding errors are displayed inline within the affected input card, and QR code generation is disabled until errors are resolved.
- What happens when multiple inputs are reordered simultaneously?
- ~~How does the system handle very long input labels or data?~~ **Resolved**: Very long labels and data are truncated in display with ellipsis; full content is accessible via hover tooltip or expand action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create multiple inputs with unique identifiers
- **FR-002**: System MUST support four input types: String, JSON, BitField, MAC
- **FR-003**: System MUST allow users to reorder inputs via drag-and-drop
- **FR-004**: System MUST allow users to rename inputs with custom labels
- **FR-005**: System MUST allow users to delete inputs
- **FR-006**: System MUST maintain one active input at a time for editing
- **FR-007**: System MUST support String input with mode selection (numeric, alphanumeric, byte, ECI)
- **FR-008**: System MUST filter String input text based on selected mode constraints
- **FR-009**: System MUST support JSON input with schema-based serialization
- **FR-010**: System MUST validate JSON input syntax before processing
- **FR-011**: System MUST support multiple encoding strategies for JSON (Byte, Alphanumeric, String, PER-ModHex, PER-NTRU, None)
- **FR-011a**: System MUST support ModHex encoding which converts binary data to ModHex character set (CBDEFGHIJKLNRTUV) for alphanumeric QR mode
- **FR-011b**: System MUST support NTRUPrime encoding which converts binary data to decimal digits for numeric QR mode
- **FR-011c**: System MUST auto-detect appropriate encoding from schema structure when no encoding is explicitly selected
- **FR-012**: System MUST support BitField input with field definitions (name, bit length, value)
- **FR-013**: System MUST validate BitField field values against bit length constraints
- **FR-014**: System MUST support MAC input with source input selection and algorithm choice
- **FR-015**: System MUST recalculate MAC when source inputs change
- **FR-015a**: System MUST recalculate MAC automatically when a referenced input is deleted, using only the remaining referenced inputs
- **FR-016**: System MUST provide input parsing preview for all input types
- **FR-017**: System MUST display parsing errors clearly to users inline within the affected input card
- **FR-017a**: System MUST disable QR code generation when any input has encoding errors
- **FR-018**: System MUST preserve input order in QR code encoding
- **FR-019**: System MUST handle input dependencies (e.g., MAC referencing other inputs) by allowing deletion of referenced inputs and automatically updating dependent inputs
- **FR-020**: System MUST allow inputs with empty or null values and encode them as empty segments in the QR code
- **FR-021**: System MUST detect when total input data exceeds QR code capacity and show a warning to the user
- **FR-022**: System MUST provide user choice to either truncate data or upgrade QR version (if maximum version not reached) when capacity is exceeded
- **FR-023**: System MUST truncate very long input labels and data values in display with ellipsis
- **FR-024**: System MUST provide hover tooltip or expand action to view full content of truncated labels and data

### Key Entities

- **Input**: Represents a single data input with id, label, type, and type-specific data (text/mode for String, obj/schema/encoding for JSON, fields for BitField, sources/algorithm for MAC)
- **ModHex Encoding**: Custom encoding strategy that converts binary data to ModHex character set (CBDEFGHIJKLNRTUV), mapping each hex digit to a ModHex character, resulting in alphanumeric QR mode output
- **NTRUPrime Encoding**: Custom encoding strategy based on NTRUPrime algorithm that converts binary data to compact decimal digit streams, resulting in numeric QR mode output
- **Field**: Represents a BitField field definition with name, bit length, and optional value
- **Parsed Input**: Result of parsing an input, containing encoded data, mode, and encoding information

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create and manage at least 10 inputs without performance degradation
- **SC-002**: Input reordering completes in under 100ms
- **SC-003**: Input parsing preview updates within 200ms of data changes
- **SC-004**: All input types can be created, edited, and deleted successfully
- **SC-005**: Input validation errors are displayed within 500ms of invalid data entry
- **SC-006**: MAC generation completes within 1 second for inputs up to 10KB
- **SC-007**: JSON validation identifies syntax errors with 100% accuracy
- **SC-008**: BitField value validation prevents invalid values from being set

