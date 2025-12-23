# Tasks: QArt QR Code Generation

**Input**: Design documents from `/specs/003-qart-generation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be fully implemented

**⚠️ CRITICAL**: Some user story work can begin, but these tasks enable full feature completion

- [X] T001 [P] [Foundation] Implement `calculateImageComplexity` function in `src/domain/image/index.ts` to compute complexity score from ImageData using `computeImportanceMap` variance
- [X] T002 [P] [Foundation] Implement `calculateQArtCapacityRequirement` function in `src/domain/qart/capacity.ts` (new file) that calculates additional capacity based on image complexity, QR size, and user input bits (base: 50% of user input, complexity factor: 0.1-0.3, size factor: 1.0/1.2/1.5)
- [X] T003 [P] [Foundation] Implement `checkVersionCapacityForQArt` function in `src/domain/qart/capacity.ts` that checks if version has sufficient capacity and returns `VersionCapacityCheckResult` with warning message
- [X] T004 [P] [Foundation] Implement `convertTransparencyToWhite` function in `src/domain/image/index.ts` that converts transparent areas in ImageData to white background using canvas compositing
- [X] T005 [P] [Foundation] Implement `detectExtremeScaling` function in `src/domain/image/index.ts` that detects if scale factor is extreme (> 10x or < 0.1x) and returns warning message
- [X] T006 [Foundation] Integrate transparency conversion into `ImageTransformContext` pipeline in `src/state/image/ImageTransformContext.tsx` to automatically convert alpha channels before QArt processing

**Checkpoint**: Foundation ready - user story implementation can now proceed with full feature support

---

## Phase 2: User Story 1 - Generate QArt QR Code from Image (Priority: P1) 🎯 MVP

**Goal**: Core QArt functionality - generate QArt QR codes that embed images while maintaining scannability

**Independent Test**: Load an image, configure QArt options, verify a scannable QR code is generated that visually matches the image

### Implementation for User Story 1

- [X] T007 [US1] Enhance `generateQArt` function in `src/domain/qart/index.ts` to ensure it properly handles AbortSignal for cancellation (FR-021)
- [X] T008 [US1] Update `QRQArt` component in `src/components/QRQArt.jsx` to properly use AbortController with signal prop for cancellation (FR-018, FR-019, FR-020)
- [X] T009 [US1] Add image requirement validation in `QRQArt` component to show error message when no image is loaded (FR-002)
- [X] T010 [US1] Ensure `generateQArt` throws error with clear message when scannability verification fails (FR-010)
- [X] T011 [US1] Verify `generateQArt` uses mask pattern 0 (FR-008) - check existing implementation
- [X] T012 [US1] Verify `generateQArt` processes blocks independently (FR-025) - check existing implementation
- [X] T013 [US1] Ensure `generateQArt` tracks controlled modules and includes controlMatrix in result (FR-011, FR-012)

**Checkpoint**: At this point, User Story 1 should be fully functional - core QArt generation works with image embedding and scannability verification

---

## Phase 3: User Story 2 - Configure QArt Generation Parameters (Priority: P2)

**Goal**: Allow users to configure QArt generation parameters (priority function type) to control module prioritization

**Independent Test**: Adjust priority function and verify generated QR code changes appropriately

### Implementation for User Story 2

- [X] T014 [P] [US2] Add priority function type state to `QRQArt` component (`"contrast"` or `"random"`) in `src/components/QRQArt.jsx`
- [X] T015 [US2] Add priority function selector UI to QArt settings panel in `src/components/QRQArt.jsx` (radio buttons or select dropdown)
- [X] T016 [US2] Pass priority function type to `buildBitOrder` function in `src/domain/qart/bitPriority.ts` (verify it accepts and uses priority type)
- [X] T017 [US2] Ensure priority function change triggers regeneration with debouncing (FR-020, FR-024)
- [X] T018 [US2] Verify cancellation works when priority function changes during generation (FR-020)

**Checkpoint**: At this point, User Story 2 should be functional - users can select priority function and see results change

---

## Phase 4: User Story 3 - View Controllable Modules Visualization (Priority: P2)

**Goal**: Visualize which modules were successfully controlled during QArt generation

**Independent Test**: Generate QArt codes and verify control matrix visualization displays correctly

### Implementation for User Story 3

- [X] T019 [US3] Verify `createControlMatrix` function in `src/domain/qart/controlMatrix.ts` properly marks controlled modules
- [X] T020 [US3] Ensure control matrix is included in `QArtResult` from `generateQArt` (FR-012)
- [X] T021 [US3] Verify control view toggle in `QRQArt` component works correctly (already exists, verify functionality)
- [X] T022 [US3] Test control matrix visualization renders within 500ms performance requirement (SC-014)

**Checkpoint**: At this point, User Story 3 should be functional - control matrix visualization works correctly

---

## Phase 5: User Story 4 - QR Code Version Capacity for QArt (Priority: P2)

**Goal**: Inform users when selected QR version has insufficient capacity and auto-select appropriate version in Auto mode

**Independent Test**: Select versions with insufficient capacity and verify warnings appear; use Auto mode to verify appropriate version selection

### Implementation for User Story 4

- [X] T023 [US4] Integrate `checkVersionCapacityForQArt` into `QRQArt` component to check capacity before generation (FR-014)
- [X] T024 [US4] Display warning message in `QRQArt` component when version has insufficient capacity (FR-015) - use `MessageBanner` component
- [ ] T025 [US4] Implement Auto version selection logic in `useDerivedQRData` hook or `QRQArt` component that selects version with sufficient capacity when Auto mode is enabled and QArt is active (FR-016)
- [ ] T026 [US4] Calculate QArt capacity requirement dynamically using `calculateQArtCapacityRequirement` when Auto mode is enabled (FR-017)
- [ ] T027 [US4] Ensure warning displays within 200ms of capacity check (SC-012)
- [ ] T028 [US4] Handle edge case where version has exactly minimum capacity (no room for QArt) - show warning (FR-015 clarification)
- [ ] T029 [US4] Display QArt-added data segments in input UI (FR-013) - may require integration with InputContext

**Checkpoint**: At this point, User Story 4 should be functional - version capacity warnings and Auto mode selection work correctly

---

## Phase 6: User Story 5 - Image Scaling and Rasterization for QArt (Priority: P2)

**Goal**: Ensure uploaded images are scaled appropriately before rasterization, preserving aspect ratio

**Independent Test**: Upload images of various sizes and verify they are scaled correctly before rasterization

### Implementation for User Story 5

- [ ] T030 [US5] Verify `calculateAppropriateImageScale` function in `src/domain/image/index.ts` preserves aspect ratio (FR-003, FR-004)
- [ ] T031 [US5] Ensure image scaling handles images that are too small or too large by scaling to fit QR dimensions (FR-026)
- [ ] T032 [US5] Integrate `detectExtremeScaling` into image transform pipeline to detect extreme scaling cases
- [ ] T033 [US5] Display warning message in `QRQArt` component when extreme scaling is detected (FR-027) - use `MessageBanner` component
- [ ] T034 [US5] Integrate `convertTransparencyToWhite` into image transform pipeline before rasterization (FR-028)
- [ ] T035 [US5] Verify transparency conversion happens automatically when image has alpha channel (FR-028)
- [ ] T036 [US5] Ensure image scaling completes within 200ms performance requirement (SC-005)
- [ ] T037 [US5] Ensure image rasterization completes within 100ms performance requirement (SC-006)

**Checkpoint**: At this point, User Story 5 should be functional - image scaling, transparency handling, and warnings work correctly

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure all requirements are met

- [ ] T038 [P] [Polish] Verify all error messages are displayed within 200ms (SC-011) - check `QRQArt` component error handling
- [ ] T039 [P] [Polish] Verify loading states accurately reflect generation progress (SC-013) - check `QRQArt` component loading state
- [ ] T040 [Polish] Ensure debouncing prevents excessive regeneration (max 1 per 300ms) (SC-009, FR-024) - verify `QRQArt` useEffect debounce
- [ ] T041 [Polish] Verify generation cancellation completes within 100ms (SC-010) - test AbortController cancellation
- [ ] T042 [Polish] Ensure QArt-added data segments are displayed in input UI within 200ms (SC-015) - may require InputContext integration
- [ ] T043 [Polish] Verify version capacity check completes within 50ms (SC-007) - profile `checkVersionCapacityForQArt`
- [ ] T044 [Polish] Verify scannability verification completes within 500ms (SC-008) - profile `validateDecode` function
- [ ] T045 [Polish] Code cleanup and refactoring - ensure DRY principles, no duplicate image processing logic
- [ ] T046 [Polish] Verify all functional requirements (FR-001 through FR-028) are implemented and tested
- [ ] T047 [Polish] Run quickstart.md validation - ensure all examples work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Can start immediately (core functionality exists), but benefits from Foundation tasks
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion
- **User Story 3 (Phase 4)**: Depends on User Story 1 completion (needs control matrix)
- **User Story 4 (Phase 5)**: Depends on Foundation tasks (T002, T003) and User Story 1
- **User Story 5 (Phase 6)**: Depends on Foundation tasks (T004, T005) and can run in parallel with other stories
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately - core exists, needs enhancements
- **User Story 2 (P2)**: Depends on User Story 1 - needs working QArt generation
- **User Story 3 (P2)**: Depends on User Story 1 - needs control matrix from generation
- **User Story 4 (P2)**: Depends on Foundation (capacity functions) and User Story 1
- **User Story 5 (P2)**: Depends on Foundation (transparency, scaling detection) - can run in parallel with US2/US3

### Within Each User Story

- Foundation tasks marked [P] can run in parallel
- User Story 1 tasks should be completed before moving to other stories
- User Stories 2-5 can be worked on in parallel after User Story 1 is complete
- Polish tasks can be worked on incrementally as stories complete

### Parallel Opportunities

- All Foundation tasks marked [P] can run in parallel (T001-T005)
- User Stories 2, 3, and 5 can run in parallel after User Story 1 completes
- Polish tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundation (capacity functions, transparency, scaling detection)
2. Complete Phase 2: User Story 1 (core QArt generation enhancements)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundation → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Polish → Final validation → Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundation together (T001-T006)
2. Once Foundation is done:
   - Developer A: User Story 1 (core generation)
   - Developer B: User Story 5 (image processing) - can start in parallel
3. Once User Story 1 is done:
   - Developer A: User Story 2 (parameters)
   - Developer B: User Story 3 (visualization)
   - Developer C: User Story 4 (capacity checking)
4. All developers: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group (per constitution)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Most core QArt functionality already exists - focus on enhancements and missing features
- Foundation tasks enable full feature completion but some user stories can start without them

