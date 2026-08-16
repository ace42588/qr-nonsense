# QR-Nonsense Feature Specifications

This directory contains comprehensive feature specifications for the QR-Nonsense project. These specifications are used with spec-kit for continued development.

## Specification Index

### Foundational Specifications

- **[000 - Foundational Technical Basis](./000-foundational-technical-basis/spec.md)**
  - Documents the complete technology stack, project structure, architectural patterns, and development workflow
  - Essential reading for all developers working on the project
  - Includes: Technology stack, build configuration, browser compatibility, architectural decisions

### Core Feature Specifications

- **[001 - Input Management System](./001-input-management/spec.md)**
  - Comprehensive input management supporting multiple input types
  - Input types: String, JSON, BitField, MAC
  - Features: Drag-and-drop reordering, input parsing, preview functionality

- **[002 - Standard QR Code Generation](./002-standard-qr-generation/spec.md)**
  - Core QR code generation functionality
  - Features: Error correction levels, version selection, data mask configuration, interactive visualization

- **[003 - QArt QR Code Generation](./003-qart-generation/spec.md)**
  - QArt-style QR code generation embedding images while maintaining scannability
  - Features: Image-based optimization, Reed-Solomon basis matrices, decode validation, control matrix visualization

- **[004 - Halftone QR Code Generation](./004-halftone-generation/spec.md)**
  - Halftone QR code generation applying image-based patterns to modules
  - Features: Pattern library, importance-based selection, brightness-based pattern matching

- **[005 - Combined QR Code Generation](./005-combined-generation/spec.md)**
  - Combined generation merging QArt and halftone techniques
  - Features: Dual optimization, parameter configuration for both techniques, combined statistics

- **[009 - IS-QR Generation](./009-isqr-generation/spec.md)**
  - Browser IS-QR beautification via saliency instance ROI, ROI-aware QArt, DWT/CSF, and PSNR/MSE/SSIM/FSIM/GMSD metrics

- **[010 - Ambiguous QR Generation](./010-ambiguous-qr-generation/spec.md)**
  - Dual-payload Ambiguous mode: shared format, 2×2 checkered modules where bits differ

- **[011 - Embedded Dual-Payload QR](./011-embedded-qr-generation/spec.md)**
  - Dual-payload Embed mode: 3×3 modules with outer eight from Payload A and center from Payload B

### Supporting Feature Specifications

- **[006 - QR Code Scanner](./006-qr-scanner/spec.md)**
  - QR code scanning functionality using device camera
  - Features: Camera access, QR code detection, retry functionality, scanned data import

- **[007 - Visualization Features](./007-visualization-features/spec.md)**
  - Visualization tools for exploring QR code structure
  - Features: Symbols view, codewords view, data flow graph, cross-view highlighting

- **[008 - Image Transformation and Upload](./008-image-transformation/spec.md)**
  - Image upload and transformation capabilities
  - Features: File upload, URL loading, image transformations (scale, rotate, brightness, contrast), preview

## Specification Structure

Each specification follows the standard spec-template.md structure:

1. **User Scenarios & Testing**: Prioritized user stories with acceptance scenarios
2. **Requirements**: Functional requirements (FR-XXX) and key entities
3. **Success Criteria**: Measurable, technology-agnostic outcomes (SC-XXX)

## Using These Specifications

### For Development

1. Start with the foundational specification (000) to understand the technical basis
2. Reference feature specifications when implementing or modifying features
3. Use `/speckit.plan` command to create implementation plans from specifications
4. Use `/speckit.tasks` command to break down plans into actionable tasks

### For Planning

- Specifications are technology-agnostic and focus on user value
- Each specification includes measurable success criteria
- User stories are prioritized (P1, P2, P3) for implementation planning

### For Testing

- Acceptance scenarios provide test cases
- Success criteria define measurable outcomes
- Edge cases are documented for comprehensive testing

## Specification Status

All specifications are marked as **Complete** and ready for use with spec-kit workflows.

## Related Documentation

- [Constitution](../.specify/memory/constitution.md): Project principles and coding standards
- [Templates](../.specify/templates/): Specification and planning templates
- [Commands](../.cursor/commands/): Spec-kit command definitions

## Questions or Updates

When updating specifications:
1. Follow the spec-template.md structure
2. Maintain technology-agnostic language
3. Update status and dates appropriately
4. Ensure all mandatory sections are completed

