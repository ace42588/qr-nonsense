# Feature Specification: Combined QR Code Generation

**Feature Branch**: `005-combined-generation`  
**Created**: 2025-01-27  
**Status**: Complete  
**Input**: User description: "Combined QR code generation that merges QArt and halftone techniques"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Combined QR Code (Priority: P1)

As a user, I need to generate a combined QR code that uses both QArt optimization and halftone patterns so I can create QR codes with maximum visual fidelity while maintaining scannability.

**Why this priority**: This combines the best of both QArt and halftone techniques for superior visual results.

**Independent Test**: Can be fully tested by loading an image, selecting combined mode, and verifying a QR code is generated with both QArt optimization and halftone patterns.

**Acceptance Scenarios**:

1. **Given** I have inputs and an uploaded image, **When** I select combined mode, **Then** a combined QR code is generated using both QArt and halftone
2. **Given** I have inputs but no image, **When** I select combined mode, **Then** an error message indicates an image is required
3. **Given** I modify the source image, **When** the combined QR code regenerates, **Then** it reflects the new image with both techniques applied
4. **Given** I generate a combined QR code, **When** I scan it with a QR code reader, **Then** it successfully decodes the original data

---

### User Story 2 - Configure Combined Generation Parameters (Priority: P2)

As a user, I need to configure both QArt and halftone parameters independently so I can fine-tune the visual appearance and reliability.

**Why this priority**: Allows users to balance QArt optimization strength and halftone pattern granularity.

**Independent Test**: Can be fully tested by adjusting QArt and halftone parameters and verifying the combined QR code changes appropriately.

**Acceptance Scenarios**:

1. **Given** I have combined generation settings, **When** I adjust QArt decode redundancy, **Then** the QArt optimization strength changes
2. **Given** I have combined generation settings, **When** I adjust halftone module pixel size, **Then** the halftone pattern granularity changes
3. **Given** I adjust combined parameters, **When** the QR code regenerates, **Then** it reflects both QArt and halftone changes
4. **Given** I set conflicting parameters, **When** generation completes, **Then** the system balances both techniques appropriately

---

### User Story 3 - View Combined Generation Results (Priority: P2)

As a user, I need to see combined generation statistics (QArt visual error, decode success rate, halftone pattern coverage) so I can understand how well the QR code matches the target image.

**Why this priority**: Provides feedback on generation quality and helps users optimize parameters.

**Independent Test**: Can be fully tested by generating combined QR codes and verifying statistics are displayed accurately.

**Acceptance Scenarios**:

1. **Given** I generate a combined QR code, **When** generation completes, **Then** QArt and halftone statistics are displayed
2. **Given** I generate a combined QR code, **When** I view the control matrix, **Then** I can see which modules were QArt-controlled
3. **Given** I compare different combined generations, **When** I view statistics, **Then** I can assess which parameters produce better results

---

### Edge Cases

- What happens when QArt generation fails but halftone could still be applied?
- How does the system handle cases where QArt and halftone conflict?
- What happens when combined generation takes longer than expected?
- How does the system prioritize QArt optimization vs halftone pattern matching?
- What happens when inputs change during combined generation?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate combined QR codes using both QArt optimization and halftone patterns
- **FR-002**: System MUST require a target image before combined generation
- **FR-003**: System MUST apply QArt optimization first to ensure QR code correctness
- **FR-004**: System MUST apply halftone patterns to QArt-optimized modules
- **FR-005**: System MUST ensure halftone pattern center matches QArt module value for reliability
- **FR-006**: System MUST support all QArt configuration parameters (decode redundancy, decode trials)
- **FR-007**: System MUST support all halftone configuration parameters (module pixel size, importance weighting)
- **FR-008**: System MUST display combined generation statistics (QArt error, decode rate, halftone coverage)
- **FR-009**: System MUST regenerate combined QR code when inputs change
- **FR-010**: System MUST regenerate combined QR code when target image changes
- **FR-011**: System MUST regenerate combined QR code when QArt parameters change
- **FR-012**: System MUST regenerate combined QR code when halftone parameters change
- **FR-013**: System MUST handle combined generation cancellation gracefully
- **FR-014**: System MUST display loading state during combined generation
- **FR-015**: System MUST display error messages when combined generation fails
- **FR-016**: System MUST debounce rapid parameter changes to avoid excessive regeneration
- **FR-017**: System MUST ensure QArt optimization maintains QR code correctness before halftone application
- **FR-018**: System MUST handle cases where QArt fails but halftone could still be applied (fallback behavior)

### Key Entities

- **Combined Generation Options**: Configuration including QArt options and halftone options
- **Combined Result**: Generated QR code matrix with both QArt optimization and halftone patterns applied, including statistics from both techniques
- **QArt-Optimized Matrix**: QR code matrix after QArt optimization, used as base for halftone application
- **Pattern Matching**: Process of selecting halftone patterns that match image while respecting QArt module values

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Combined generation completes within 6 seconds for QR codes up to version 10
- **SC-002**: Combined generation completes within 35 seconds for QR codes up to version 20
- **SC-003**: Generated combined QR codes achieve minimum decode redundancy (default 0.8) in 95%+ of cases
- **SC-004**: Generated combined QR codes are scannable by standard QR code readers with 80%+ success rate
- **SC-005**: Combined regeneration debouncing prevents excessive generation (max 1 per 300ms)
- **SC-006**: Generation cancellation completes within 200ms
- **SC-007**: Error messages are displayed within 200ms of generation failure
- **SC-008**: Loading states accurately reflect generation progress for both QArt and halftone phases
- **SC-009**: Halftone patterns respect QArt module values 100% of the time
- **SC-010**: Combined statistics accurately reflect both QArt and halftone contributions

