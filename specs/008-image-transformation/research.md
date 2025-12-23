# Research: Image Transformation and Upload

**Feature**: 008-image-transformation  
**Date**: 2025-01-27  
**Status**: Complete

## Research Tasks

### Task 1: Image Upload and Loading Infrastructure

**Question**: What infrastructure exists for image upload and loading?

**Findings**:
- `ImageTransformContext` provides state management for image transformation
- `useImageUpload` hook handles file upload via FileReader API
- `useImageLoader` hook handles image loading from URLs
- `loadImage` function in `domain/image/index.ts` loads images with CORS support
- Canvas-based transformation in `domain/image/transform.ts` handles scale, translation, and transparency

**Decision**: Reuse existing infrastructure. Enhance with validation and error handling.

**Rationale**: Existing implementation covers core functionality. Validation and error handling are the main gaps.

**Alternatives Considered**:
- N/A (existing implementation is appropriate)

---

### Task 2: File Size and Dimension Validation

**Question**: How should file size (10MB) and dimension (4096x4096) validation be implemented?

**Findings**:
- File size can be checked via `file.size` property before FileReader processing
- Image dimensions available after image load via `img.width` and `img.height`
- Canvas can handle large images but performance degrades
- Browser memory limits may be hit with very large images

**Decision**: 
- Validate file size before FileReader (reject >10MB with error)
- Validate dimensions after image load (auto-scale if >4096x4096, show error only if scaling fails)
- Use canvas downscaling for dimension reduction

**Rationale**: Early file size rejection prevents unnecessary processing. Dimension validation after load allows access to actual dimensions. Auto-scaling provides better UX than rejection.

**Alternatives Considered**:
- Reject large dimensions entirely: Rejected - too restrictive, auto-scaling is better UX
- Validate dimensions before load: Rejected - dimensions unknown until image loads

---

### Task 3: Transparency and Alpha Channel Handling

**Question**: How should images with transparency be handled?

**Findings**:
- Canvas `drawImage` preserves transparency by default
- QR code generation requires opaque images
- Current `transformImageToCanvas` fills canvas with white background before drawing
- This effectively converts transparency to white background

**Decision**: Continue using white background fill before drawing (already implemented).

**Rationale**: White background matches QR code expectations and canvas fill. No changes needed.

**Alternatives Considered**:
- Preserve transparency: Rejected - QR generation requires opaque images
- Black background: Rejected - white is standard for QR codes

---

### Task 4: Concurrent Upload/Load Cancellation

**Question**: How should concurrent upload/load operations be cancelled?

**Findings**:
- FileReader API doesn't support cancellation
- Image loading from URL can use AbortController with fetch API
- Current implementation uses `isMounted` flag for cleanup
- New image URL assignment cancels previous operation via state update

**Decision**: 
- For file uploads: Cancel by ignoring FileReader result if new upload started (via ref tracking)
- For URL loading: Use AbortController pattern with fetch API
- Track in-progress operations and cancel when new operation starts

**Rationale**: FileReader limitation requires workaround. AbortController is standard for URL loading. State-based cancellation already partially implemented.

**Alternatives Considered**:
- Queue operations: Rejected - spec requires immediate cancellation
- Allow concurrent operations: Rejected - spec requires cancellation

---

### Task 5: Error Handling and User Feedback

**Question**: How should errors be displayed and handled?

**Findings**:
- `ImageTransformContext` has `error` state
- `message-banner.jsx` component exists for displaying messages
- Network errors need specific handling (CORS, timeout, connection)
- File read errors need user-friendly messages

**Decision**: 
- Use existing error state in context
- Display errors via message banner component
- Provide specific error messages for different failure types
- No automatic retry (user must manually re-attempt)

**Rationale**: Existing infrastructure supports error display. Spec requires no automatic retry. Specific messages improve UX.

**Alternatives Considered**:
- Automatic retry: Rejected - spec explicitly requires manual retry
- Toast notifications: Rejected - message banner already exists and is appropriate

---

### Task 6: Image Format Support

**Question**: What image formats should be supported?

**Findings**:
- Browser supports JPEG, PNG, GIF, WebP natively via `<img>` and canvas
- File input `accept="image/*"` allows all image types
- Canvas can render all browser-supported formats

**Decision**: Support JPEG, PNG, GIF, WebP (already supported via browser APIs).

**Rationale**: Browser native support covers these formats. No additional processing needed.

**Alternatives Considered**:
- Additional format libraries: Rejected - unnecessary, browser support sufficient

---

## Summary

All research tasks complete. Main implementation gaps identified:
1. File size validation (10MB limit)
2. Dimension validation (4096x4096 limit with auto-scaling)
3. Improved error handling and messages
4. Cancellation of in-progress operations
5. CORS error handling improvements

Existing infrastructure is solid and can be enhanced with these additions.

