# Feature Specification: Animated GIF Inputs

**Feature Branch**: `014-animated-gif-inputs`  
**Created**: 2026-08-18  
**Status**: Complete  
**Input**: User description: "Add support for animated GIF inputs for QArt, halftone, and IS-QR, with per-frame generation, playback, and GIF export. Animated IS-QR uses auto ROI only."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload an Animated GIF (Priority: P1)

As a user, I need to upload an animated GIF so image-based QR modes can use every frame, not only the first.

**Why this priority**: Decoding multi-frame GIFs is required for every later story.

**Independent Test**: Upload an animated GIF and verify the sidebar reports more than one frame and that still JPEG/PNG/WebP uploads still work.

**Acceptance Scenarios**:

1. **Given** I have an animated GIF, **When** I upload it, **Then** the system loads all frames (up to the frame cap) with their delays
2. **Given** I upload a single-frame GIF, JPEG, PNG, or WebP, **When** it loads, **Then** behavior matches the existing still-image path
3. **Given** the GIF has more frames than the cap, **When** it is processed, **Then** frames are subsampled evenly, total duration is preserved, and a warning is shown
4. **Given** I load an animated GIF from a URL, **When** the response is a GIF, **Then** frames are decoded the same way as a file upload

---

### User Story 2 - Preview Animated QArt, Halftone, and IS-QR (Priority: P1)

As a user, I need the QR canvas to play back generated frames at the GIF’s timing so I can see the animation.

**Why this priority**: Preview is how users confirm the feature works before export.

**Independent Test**: Upload a short animated GIF, wait for generation, and verify the canvas animates in halftone, QArt, and IS-QR modes.

**Acceptance Scenarios**:

1. **Given** an animated GIF is loaded in halftone mode, **When** generation is ready, **Then** the same QR matrix is drawn using each frame’s image in sequence
2. **Given** an animated GIF is loaded in QArt mode, **When** generation completes, **Then** each frame has its own optimized matrix and the canvas plays them in order
3. **Given** an animated GIF is loaded in IS-QR mode, **When** generation completes, **Then** each frame uses auto ROI computed from that frame (no mask upload) and the canvas plays them in order
4. **Given** generation is in progress, **When** I watch the canvas, **Then** playback is paused until generation finishes
5. **Given** I change scale or position, **When** the debounce elapses, **Then** all frames are regenerated with the new transform

---

### User Story 3 - Export an Animated GIF (Priority: P2)

As a user, I need to download the animated QR as a GIF so I can share it.

**Why this priority**: Export is the deliverable; PNG/SVG stills remain useful snapshots.

**Independent Test**: Generate an animated QR and download GIF; open it and confirm it animates with the expected frame count.

**Acceptance Scenarios**:

1. **Given** the source is animated, **When** I open Download in an image mode, **Then** a “Download as GIF” option is available
2. **Given** I download as GIF, **When** the file is opened, **Then** it contains the generated frames with source delays
3. **Given** I download PNG or SVG, **When** the file is saved, **Then** it is a snapshot of the current frame
4. **Given** the source is a still image, **When** I open Download, **Then** GIF is not offered

---

### User Story 4 - Still Images Unchanged (Priority: P2)

As a user of still images, I need existing upload, transform, generate, and download behavior to stay the same.

**Why this priority**: Animation must not regress the current still pipeline.

**Independent Test**: Upload a PNG, generate QArt/halftone/IS-QR, download PNG/SVG/STL.

**Acceptance Scenarios**:

1. **Given** a still image, **When** I generate any image mode, **Then** results match the pre-animation pipeline
2. **Given** a still image in IS-QR, **When** I upload a ROI mask, **Then** the mask is applied as today
3. **Given** an animated source in IS-QR, **When** I view settings, **Then** the ROI mask picker is hidden or disabled

---

### Edge Cases

- GIF with delay 0: treat as 100ms (common browser default)
- GIF disposal methods 0–3: composite correctly so frames match typical viewers
- Dimensions over 4096: scale each frame down; do not re-encode the whole GIF as PNG
- File over 10MB: reject with the existing size error
- Switching from an animated GIF to a still (or the reverse): cancel in-progress generation and replace immediately
- IS-QR with a leftover still mask after switching to an animated source: ignore the mask and use auto ROI
- Non-image modes (standard, ambiguous, embed): ignore animation; no GIF export

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST decode multi-frame GIF files and GIF URLs into ordered frames with delays
- **FR-002**: System MUST treat single-frame GIFs and non-GIF images as stills (existing pipeline)
- **FR-003**: System MUST cap animations at 24 frames, subsample evenly when over the cap, preserve total duration, and warn the user
- **FR-004**: System MUST apply the same scale and position transform to every frame
- **FR-005**: Halftone MUST keep one QR matrix and redraw using each frame’s pixels
- **FR-006**: QArt MUST run generation independently for each frame (same payload, image-matching bits may differ)
- **FR-007**: IS-QR MUST run generation independently for each frame using auto ROI only (`maskImage` unset)
- **FR-008**: System MUST NOT offer animated or per-frame ROI mask upload
- **FR-009**: System MUST hide or disable the still ROI mask picker while the source is animated
- **FR-010**: System MUST play back generated frames using source delays after generation completes
- **FR-011**: System MUST pause playback while generation is in progress
- **FR-012**: System MUST offer GIF download in image modes when the source is animated
- **FR-013**: PNG, SVG, and STL downloads MUST remain snapshots of the current frame
- **FR-014**: System MUST convert transparent GIF pixels to white during transformation (same as stills)

### Key Entities

- **Animation Source**: Ordered frames plus per-frame delays and optional loop count
- **Transformed Frame**: A frame after shared scale/offset, sized for generation
- **Generated Frame**: Mode-specific result for one source frame (QArt/IS-QR result or halftone sample image)
- **Playback Clock**: Current frame index driven by delays; paused during generation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An animated GIF with 24 or fewer frames loads and is ready for generation without dropping frames
- **SC-002**: A GIF with more than 24 frames is reduced to 24 frames and the user is warned
- **SC-003**: Halftone, QArt, and IS-QR canvases play the animation at approximately the source timing after generation
- **SC-004**: GIF export contains the same number of frames as the loaded (capped) animation
- **SC-005**: Still-image upload, generate, mask, and PNG/SVG/STL download continue to work without extra steps
- **SC-006**: IS-QR on an animated source never applies a user-uploaded mask
