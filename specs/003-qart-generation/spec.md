# Feature Specification: QArt QR Code Generation

**Feature Branch**: `003-qart-generation`  
**Created**: 2025-01-27  
**Status**: Complete  
**Input**: User description: "QArt-style QR code generation that embeds images while maintaining scannability"

## Clarifications

### Session 2025-01-27

- Q: How should the system determine additional capacity requirements for QArt generation when version is set to Auto? → A: Dynamic calculation based on image complexity and QR code size
- Q: What happens when the target image is too small or too large for the QR code dimensions? → A: Scale to fit QR dimensions while preserving aspect ratio, with warnings for extreme cases
- Q: How does the system handle images with transparency or alpha channels? → A: Convert transparent areas to white background
- Q: What happens when inputs change during QArt generation? → A: Cancel current generation and start new one with updated inputs
- Q: What happens when the selected QR version has exactly the minimum capacity (no room for QArt)? → A: Treat as insufficient capacity and show a warning (same as FR-015)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate QArt QR Code from Image (Priority: P1)

As a user, I need to generate a QArt QR code that incorporates an image while maintaining scannability so I can create visually appealing QR codes that still function correctly.

**Why this priority**: This is the core QArt functionality - embedding images into QR codes while preserving functionality.

**Independent Test**: Can be fully tested by loading an image, configuring QArt options, and verifying a scannable QR code is generated that visually matches the image.

**Acceptance Scenarios**:

1. **Given** I have inputs and an uploaded image, **When** I select QArt mode, **Then** a QArt QR code is generated that incorporates the image
2. **Given** I have inputs but no image, **When** I select QArt mode, **Then** an error message indicates an image is required
3. **Given** I modify the source image, **When** the QArt QR code regenerates, **Then** it reflects the new image appearance
4. **Given** I generate a QArt QR code, **When** I scan it with a QR code reader, **Then** it successfully decodes the original data

---

### User Story 2 - Configure QArt Generation Parameters (Priority: P2)

As a user, I need to configure QArt generation parameters (priority function type) so I can control how modules are prioritized for image matching.

**Why this priority**: The priority function determines which modules are controlled first, affecting visual fidelity and generation quality.

**Independent Test**: Can be fully tested by adjusting priority function and verifying the generated QR code changes appropriately.

**Acceptance Scenarios**:

1. **Given** I have QArt generation settings, **When** I select contrast-based priority, **Then** modules in high-contrast regions are prioritized lower than low-contrast regions
2. **Given** I have QArt generation settings, **When** I select random priority, **Then** modules are prioritized randomly for a more uniform distribution
3. **Given** I adjust QArt parameters, **When** the QR code regenerates, **Then** it reflects the new parameter values
4. **Given** I adjust QArt parameters while generation is in progress, **When** the parameters change, **Then** the current generation is canceled and a new generation starts with updated parameters
5. **Given** I generate a QArt QR code, **When** scannability verification fails, **Then** an error is thrown indicating the QR code is not scannable

---

### User Story 3 - View Controllable Modules Visualization (Priority: P2)

As a user, I need to visualize which modules were successfully controlled during QArt generation so I can understand how the optimization process worked.

**Why this priority**: Visualization helps users understand the QArt generation process and identify which parts of the QR code were optimized.

**Independent Test**: Can be fully tested by generating QArt codes and verifying the control matrix visualization displays correctly.

**Acceptance Scenarios**:

1. **Given** I generate a QArt QR code, **When** I enable the control matrix view, **Then** I can see which modules were successfully controlled
2. **Given** I have a QArt QR code, **When** I toggle the control matrix visualization, **Then** it displays or hides the controlled module indicators

---

### User Story 4 - QR Code Version Capacity for QArt (Priority: P2)

As a user, I need to be informed when the selected QR code version has insufficient capacity for QArt generation, and have the system automatically select an appropriate version when using Auto mode.

**Why this priority**: QArt generation requires additional capacity beyond the user's input data, and users need clear feedback about version requirements.

**Independent Test**: Can be fully tested by selecting versions with insufficient capacity and verifying warnings appear, and by using Auto mode to verify appropriate version selection.

**Acceptance Scenarios**:

1. **Given** I have inputs and select a specific QR version, **When** that version has no additional capacity for QArt (including exactly minimum capacity), **Then** a warning is displayed indicating insufficient capacity
2. **Given** I have inputs and select "Auto" version, **When** QArt mode is enabled, **Then** the system selects a version with sufficient additional capacity (amount determined dynamically based on image complexity and QR code size)
3. **Given** I have inputs with QArt enabled, **When** I change the version to one with insufficient capacity, **Then** a warning is displayed
4. **Given** I have inputs and QArt is enabled, **When** I view the input UI, **Then** any data added by QArt (padding bytes replacement or new segment) is displayed

---

### Edge Cases

- What happens when the target image is too small or too large for the QR code dimensions? (Resolved: Scale to fit QR dimensions while preserving aspect ratio, with warnings for extreme cases)
- How does the system handle images with transparency or alpha channels? (Resolved: Convert transparent areas to white background)
- What happens when QArt generation produces a QR code that fails scannability verification? (Error is thrown)
- What happens when inputs change during QArt generation? (Resolved: Cancel current generation and start new one with updated inputs)
- How does the system handle cancellation of long-running QArt generation?
- What happens when the selected QR version has exactly the minimum capacity (no room for QArt)? (Resolved: Treat as insufficient capacity and show a warning, same as FR-015)
- How does the system determine additional capacity requirements when version is set to Auto? (Resolved: Dynamic calculation based on image complexity and QR code size)
- What happens when QArt adds data segments that exceed the input UI display capacity?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate QArt QR codes that embed target images while maintaining scannability
- **FR-002**: System MUST require a target image before QArt generation
- **FR-004**: System MUST rasterize scaled images to QR code grid dimensions without changing relative scale
- **FR-005**: System MUST optimize only padding segment bits (not data segments) for image matching, OR add new segments if padding is insufficient
- **FR-006**: System MUST use Reed-Solomon basis matrices to determine if a module can be controlled
- **FR-007**: System MUST use a priority function (contrast-based or random) to determine module control order
- **FR-008**: System MUST use mask pattern 0 for QArt generation
- **FR-009**: System MUST verify QR code scannability with a single pass/fail test (not statistical)
- **FR-010**: System MUST throw an error when scannability verification fails
- **FR-012**: System MUST generate control matrix visualization showing controllable modules
- **FR-013**: System MUST display any data added by QArt (padding bytes replacement or new segments) in the input UI
- **FR-014**: System MUST check QR code version capacity before QArt generation
- **FR-015**: System MUST display a warning when selected QR version has no additional capacity for QArt (including when version has exactly minimum capacity with no room for QArt)
- **FR-016**: System MUST select QR version with sufficient additional capacity when version is set to "Auto" and QArt is enabled
- **FR-017**: System MUST determine additional capacity requirements dynamically based on image complexity and QR code size
- **FR-018**: System MUST regenerate QArt QR code when inputs change (canceling any in-progress generation and starting new one)
- **FR-019**: System MUST regenerate QArt QR code when target image changes (canceling any in-progress generation and starting new one)
- **FR-020**: System MUST regenerate QArt QR code when QArt parameters change (canceling any in-progress generation and starting new one)
- **FR-021**: System MUST handle QArt generation cancellation gracefully
- **FR-022**: System MUST display loading state during QArt generation
- **FR-023**: System MUST display error messages when QArt generation fails
- **FR-024**: System MUST debounce rapid parameter changes to avoid excessive regeneration
- **FR-025**: System MUST process blocks independently for optimization

### Key Entities

- **QArt Options**: Configuration including segments, codewords, blocks, initial matrix, version info, error correction level, target image, priority function type, and generation parameters
- **QArt Result**: Generated QR code matrix, data mask, segments, and control matrix
- **Target Grid**: Rasterized representation of scaled target image mapped to QR code module positions
- **Control Matrix**: Visualization showing which modules were successfully controlled during optimization
- **Block Basis State**: Reed-Solomon basis matrix state for controlling module values within a block using indirect control via basis matrix operations
- **Priority Function**: Function that determines module control order (contrast-based prioritizes low-contrast regions, random prioritizes uniformly)
- **Version Capacity Check**: Validation that ensures selected QR version has sufficient capacity beyond user input for QArt generation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: QArt generation completes within 1 seconds for QR codes up to version 10
- **SC-002**: QArt generation completes within 5 seconds for QR codes up to version 20
- **SC-004**: Generated QArt QR codes are scannable by standard QR code readers with 95%+ success rate
- **SC-006**: Image rasterization completes within 100ms for QR codes up to version 20
- **SC-007**: Version capacity check completes within 50ms
- **SC-009**: QArt regeneration debouncing prevents excessive generation (max 1 per 300ms)
- **SC-010**: Generation cancellation completes within 100ms
- **SC-013**: Loading states accurately reflect generation progress
- **SC-014**: Control matrix visualization renders within 500ms
- **SC-015**: QArt-added data segments are displayed in input UI within 200ms of generation completion

