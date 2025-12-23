<!--
Sync Impact Report:
Version change: N/A (template) → 1.0.0 (initial) → 1.0.1 (clarification) → 1.0.2 (refinement)
Modified principles: V. Exploration & Research - refined to focus on creating QR codes (including non-compliant) to research scanner behavior and experiment with payloads
Added sections: Code Quality Principles, Flexibility Principles, Exploration & Research Principles, Development Workflow
Removed sections: N/A (template placeholders)
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section updated
  ✅ spec-template.md - No changes needed (already generic)
  ✅ tasks-template.md - No changes needed (already generic)
Follow-up TODOs: None
-->

# QR-Nonsense Constitution

## Core Principles

### I. Code Quality - DRY (Don't Repeat Yourself)
**MUST**: Eliminate code duplication through abstraction, shared utilities, and reusable components. When similar logic appears in multiple places, extract it into a common function, hook, or utility module. Code repetition is a code smell that MUST be addressed during refactoring.

**Rationale**: Duplication increases maintenance burden, introduces inconsistency risks, and makes bug fixes harder. A single source of truth for shared logic ensures consistency and reduces cognitive load.

### II. Code Quality - SOLID Principles
**MUST**: Adhere to SOLID design principles:
- **Single Responsibility**: Each module, class, or function MUST have one clear purpose
- **Open/Closed**: Code MUST be open for extension but closed for modification
- **Liskov Substitution**: Derived types MUST be substitutable for their base types
- **Interface Segregation**: Clients MUST NOT depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concrete implementations

**Rationale**: SOLID principles create maintainable, testable, and extensible code architecture. Violations MUST be justified in complexity tracking documentation.

### III. Code Quality - TDA (Tell, Don't Ask)
**MUST**: Objects and modules MUST encapsulate their behavior and state. Instead of querying an object's state and making decisions externally, tell the object what to do and let it handle its own logic. Prefer command methods over query methods when behavior is involved.

**Rationale**: TDA reduces coupling, improves encapsulation, and makes code more maintainable. It prevents objects from becoming mere data containers and ensures behavior stays with the data it operates on.

### IV. Flexibility & Extensibility
**MUST**: Design systems and components to be flexible and extensible without requiring modification of existing code. Use dependency injection, plugin architectures, configuration over code, and abstract interfaces. Support multiple implementations of the same interface.

**Rationale**: Requirements evolve, and new features emerge. Flexible architecture allows the codebase to adapt without major rewrites, reducing technical debt and enabling faster feature delivery.

### V. Exploration & Research
**SHOULD**: Create QR codes (including non-spec-compliant variations) to research how different QR code scanner implementations behave. Experiment with various QR code payloads, encoding modes, error correction levels, and format variations. Document findings about scanner behavior, compatibility, edge cases, and how different implementations handle non-standard QR codes. Understanding QR code standards (ISO/IEC 18004) is valuable for knowing what variations to test, but strict compliance is not required for research purposes.

**Rationale**: This project's purpose is to explore QR code scanner behavior through experimentation. Creating both standard and non-standard QR codes enables research into how different scanners handle edge cases, malformed codes, and unusual payloads. Documentation of scanner behavior findings contributes to understanding QR code technology and implementation differences.

## Development Workflow

### Code Review Standards
**MUST**: All code changes MUST be reviewed for compliance with constitution principles. Reviewers MUST verify:
- DRY compliance (no unnecessary duplication)
- SOLID adherence (especially Single Responsibility)
- TDA patterns (encapsulation of behavior)
- Flexibility considerations (extensibility without modification)
- Research documentation (when creating QR variations or testing scanner behavior)

### Refactoring Discipline
**SHOULD**: Regular refactoring to improve code quality is encouraged. When adding features, refactor adjacent code to improve quality. Technical debt MUST be tracked and addressed incrementally.

### Testing Strategy
**SHOULD**: Write tests that verify behavior, not implementation details. Tests MUST be maintainable and follow the same quality principles as production code. Focus on integration and contract tests for critical paths.

### Task-based Commit-Strategy (NON-NEGOTIABLE)
Every completed task (T001, T002, etc.) requires its own commit with a structured commit message.
**Commit-Frequency**: 
- After every completed task
- When moving on from one task category to the next
- When droping a plan with immediate reasoning

## Governance

**Constitution Supremacy**: This constitution supersedes all other coding standards and practices. When conflicts arise, constitution principles take precedence.

**Amendment Process**: 
- Amendments require documentation of rationale and impact assessment
- Version MUST follow semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Backward incompatible principle changes
- MINOR: New principles or significant expansions
- PATCH: Clarifications and refinements

**Compliance Review**: All pull requests and code reviews MUST verify constitution compliance. Violations MUST be justified in complexity tracking or addressed through refactoring.

**Version**: 1.0.2 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
