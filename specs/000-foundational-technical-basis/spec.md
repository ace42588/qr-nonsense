# Feature Specification: Foundational Technical Basis

**Feature Branch**: `000-foundational-technical-basis`  
**Created**: 2025-01-27  
**Status**: Complete  
**Input**: User description: "Document the technical foundation and architecture of QR-Nonsense"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Technical Foundation Documentation (Priority: P1)

As a developer working on QR-Nonsense, I need to understand the technical stack, architecture, and foundational capabilities so I can effectively contribute to the project and make informed technical decisions.

**Why this priority**: This is foundational knowledge required for all development work on the project.

**Independent Test**: Can be fully tested by reviewing the specification and verifying it accurately describes the existing codebase structure, dependencies, and technical decisions.

**Acceptance Scenarios**:

1. **Given** a new developer joins the project, **When** they read this specification, **Then** they understand the technology stack, project structure, and architectural patterns
2. **Given** a developer needs to add a new feature, **When** they reference this specification, **Then** they know which technologies and patterns to use
3. **Given** a developer encounters a technical decision point, **When** they consult this specification, **Then** they understand the established conventions and constraints

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST document the complete technology stack including runtime, build tools, UI frameworks, and key dependencies
- **FR-002**: System MUST document the project structure and organization patterns
- **FR-003**: System MUST document architectural patterns and design principles (DRY, SOLID, TDA)
- **FR-004**: System MUST document state management approach and data flow patterns
- **FR-005**: System MUST document development workflow, testing strategy, and quality standards
- **FR-006**: System MUST document build and deployment configuration
- **FR-007**: System MUST document browser compatibility and runtime requirements

### Key Entities

- **Technology Stack**: Runtime environment (Node.js 23.x), package manager (pnpm), build tool (Vite), UI framework (React 18.2.0), styling (Tailwind CSS), component library (Radix UI)
- **Project Structure**: Organized by domain (components, domain logic, state, hooks, types) following separation of concerns
- **Architecture Patterns**: Context-based state management, domain-driven design for QR code logic, component composition

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New developers can understand the technical foundation within 30 minutes of reading this specification
- **SC-002**: All major technical decisions are documented with rationale
- **SC-003**: Specification accurately reflects 100% of the current codebase structure and dependencies
- **SC-004**: Technical constraints and requirements are clearly identified for future development

## Technical Foundation Details

### Technology Stack

**Runtime & Package Management**:
- Node.js: Version 23.x (specified in package.json engines)
- Package Manager: pnpm
- Build Tool: Vite 4.0.0+

**Core Framework**:
- React: Version 18.2.0
- React DOM: Version 18.2.0
- TypeScript: Version 5.8.3 (mixed JS/TS codebase)

**UI & Styling**:
- Tailwind CSS: Version 3.4.17
- Radix UI: Comprehensive component library (accordion, avatar, button, card, checkbox, collapsible, dialog, dropdown-menu, label, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, switch, tabs, toggle, toggle-group, tooltip)
- Lucide React: Icon library (Version 0.511.0)
- Class Variance Authority: Component variant management (Version 0.7.1)
- Tailwind Merge: Utility for merging Tailwind classes (Version 3.3.0)
- Tailwind CSS Animate: Animation utilities (Version 1.0.7)

**State Management**:
- React Context API: Custom context providers for inputs, QR data, and image transforms
- React Hooks: Custom hooks for derived data, image loading, parsing, module hover

**Drag & Drop**:
- DND Kit: Core (Version 6.3.1), Modifiers (Version 9.0.0), Sortable (Version 10.0.0), Utilities (Version 3.2.2)

**Code Editing**:
- Monaco Editor React: Version 4.7.0

**QR Code Processing**:
- jsQR: Custom fork (https://github.com/ace42588/jsqr) for QR code scanning

**Cryptography**:
- js-sha3: Version 0.9.3 (SHA-3 hashing)
- libsodium-wrappers-sumo: Version 0.7.15 (cryptographic operations)

**Data Visualization**:
- Recharts: Version 2.15.3 (graph visualization)
- React Spring: Version 10.0.0 (animations)

**UI Utilities**:
- Sonner: Version 2.0.3 (toast notifications)
- Vaul: Version 1.1.2 (drawer component)
- Zod: Version 3.24.4 (schema validation)
- Next Themes: Version 0.4.6 (theme management)
- TanStack React Table: Version 8.21.3 (table component)

**Development Tools**:
- ESLint: Version 8.57.0 with TypeScript, React, and Prettier plugins
- Prettier: Code formatting
- Vitest: Version 2.1.8 (testing framework)
- @testing-library/react: Version 16.1.0 (React testing utilities)
- @testing-library/jest-dom: Version 6.6.3 (DOM matchers)
- @testing-library/user-event: Version 14.5.2 (user interaction simulation)
- jsdom: Version 25.0.1 (DOM environment for tests)
- @vitest/ui: Version 2.1.8 (test UI)
- @vitest/coverage-v8: Version 2.1.8 (code coverage)

**Build Configuration**:
- Vite Plugin React: Version 4.4.1
- Vite TSConfig Paths: Version 5.1.4 (path alias resolution)
- PostCSS: Version 8.5.3
- PostCSS Import: Version 16.1.0
- Autoprefixer: Version 10.4.21

### Project Structure

```
src/
├── app/                    # Main application entry point
│   └── App.tsx            # Root component with routing and layout
├── components/            # React components
│   ├── ui/                # Reusable UI components (Radix UI based)
│   ├── input-types/       # Input type specific components
│   └── [Feature components] # QR rendering, visualization, scanner components
├── domain/                # Domain-specific business logic
│   ├── encoders/          # Custom encoding logic (modHex, ntruPrime)
│   ├── halftone/         # Halftone pattern generation
│   ├── image/            # Image processing and transformation
│   ├── input/            # Input parsing and serialization
│   ├── qart/             # QArt QR code generation algorithm
│   ├── evaluate/         # Unified QR quality evaluation (penalty, RS, visual, print)
│   └── qr/               # Core QR code generation logic
│       ├── codewords/    # Codeword generation and interleaving
│       ├── constants/    # QR code constants (error correction, format info, modes)
│       ├── encoders/     # Mode-specific encoders (numeric, alphanumeric, byte, ECI)
│       ├── matrix/       # QR matrix generation and module placement
│       └── reedsolomon/  # Reed-Solomon error correction
├── hooks/                 # Custom React hooks
├── lib/                   # Library configurations and utilities
├── state/                 # State management (Context providers and reducers)
│   ├── image/            # Image transform state
│   ├── inputs/           # Input management state
│   └── qr/               # QR code generation state
├── test/                  # Test files and test utilities
├── types/                 # TypeScript type definitions
└── index.tsx             # Application entry point
```

### Architectural Patterns

**Separation of Concerns**:
- Domain logic separated from UI components
- State management separated from presentation
- Business logic in domain/ directory, UI in components/

**State Management Pattern**:
- Context API for global state (InputContext, QRDataContext, ImageTransformContext)
- Reducers for complex state updates (inputReducer, qrReducer)
- Custom hooks for derived state (useDerivedQRData, useParsedInputs)

**Component Composition**:
- Small, focused components
- Composition over inheritance
- Reusable UI components in ui/ directory

**Design Principles** (from Constitution):
- **DRY**: No code duplication, shared utilities and abstractions
- **SOLID**: Single responsibility, dependency inversion, interface segregation
- **TDA**: Encapsulation of behavior, objects handle their own logic
- **Flexibility**: Extensible without modification, plugin architectures, configuration over code

### Development Workflow

**Scripts** (from package.json):
- `pnpm start`: Start development server (Vite)
- `pnpm build`: TypeScript compilation + Vite production build
- `pnpm serve`: Preview production build
- `pnpm lint`: Run ESLint
- `pnpm lint:fix`: Fix ESLint issues automatically
- `pnpm format`: Format code with Prettier
- `pnpm format:check`: Check code formatting
- `pnpm type-check`: TypeScript type checking without emit
- `pnpm test`: Run tests with Vitest
- `pnpm test:ui`: Run tests with UI
- `pnpm test:coverage`: Run tests with coverage report
- `pnpm test:run`: Run tests once (CI mode)

**Development Server**:
- Host: 0.0.0.0 (accessible from network)
- Port: 3000
- Hot Module Replacement (HMR) enabled

**Code Quality**:
- TypeScript strict mode enabled
- ESLint with TypeScript, React, and Prettier integration
- Prettier for consistent code formatting
- Pre-commit hooks recommended (not enforced in package.json)

**Testing Strategy**:
- Unit tests: Domain logic, utilities, parsers
- Integration tests: Component interactions, state management
- Test environment: jsdom (browser-like environment)
- Coverage: V8 coverage provider with HTML, JSON, and text reports

### Build Configuration

**Vite Configuration**:
- React plugin with Fast Refresh
- Path aliases: `@/` → `./src/`
- TypeScript path resolution via vite-tsconfig-paths
- Test configuration: jsdom environment, CSS enabled, coverage reporting

**TypeScript Configuration**:
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode: Enabled
- Path aliases: `@/*` → `./src/*`
- Includes: All .ts, .tsx, .jsx, .d.ts files in src/
- Excludes: node_modules, build, dist

**PostCSS Configuration**:
- Tailwind CSS plugin
- Autoprefixer for browser compatibility
- PostCSS Import for CSS imports

**Tailwind Configuration**:
- Custom theme configuration
- Component library integration (shadcn/ui)
- Animation utilities

### Browser Compatibility

**Browserslist** (from package.json):
- `>0.2%` market share
- `not dead` (excludes browsers without updates in 24 months)

**Runtime Requirements**:
- Modern browser with ES2020 support
- Camera API support for scanner functionality (getUserMedia)
- Canvas API for QR code rendering
- Local storage for state persistence (if implemented)

### Key Architectural Decisions

1. **Mixed JS/TS Codebase**: Gradual migration approach, new code in TypeScript
2. **Context-based State**: Avoids prop drilling, enables component isolation
3. **Domain-Driven Design**: QR code logic separated into domain/ directory
4. **Component Library**: Radix UI for accessible, unstyled components
5. **Build Tool**: Vite for fast development and optimized production builds
6. **Testing**: Vitest for fast unit testing with Vite integration
7. **Code Quality**: ESLint + Prettier + TypeScript for consistent codebase

### Dependencies Rationale

- **React 18.2.0**: Modern React with concurrent features, hooks, and context API
- **Vite**: Fast development server, optimized builds, HMR
- **Radix UI**: Accessible, unstyled components matching design system needs
- **DND Kit**: Modern drag-and-drop with accessibility support
- **Monaco Editor**: Full-featured code editor for JSON/BitField inputs
- **jsQR**: QR code scanning capability
- **Recharts**: Graph visualization for codeword/segment relationships
- **Zod**: Runtime validation for input schemas

### Constraints & Limitations

- **Node.js Version**: Must use Node.js 23.x (specified in engines)
- **Package Manager**: pnpm required (lock file present)
- **Browser Support**: Modern browsers only (ES2020+)
- **Camera Access**: Scanner feature requires HTTPS or localhost
- **File Size**: Large QR codes (version 40) may impact performance
- **Image Processing**: Client-side only, limited by browser memory

### Future Considerations

- Migration of remaining JS files to TypeScript
- Performance optimization for large QR codes
- Progressive Web App (PWA) capabilities
- Offline support
- Export functionality (PNG, SVG, PDF)
- QR code history/persistence
- Multi-language support
- Accessibility improvements (ARIA labels, keyboard navigation)

