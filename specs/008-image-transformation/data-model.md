# Data Model: Image Transformation and Upload

**Feature**: 008-image-transformation  
**Date**: 2025-01-27

## Entities

### ImageTransformState

Represents the current state of image transformation in the application.

**Fields**:
- `scale: number` - Scale factor relative to canvas size (1.0 = original size relative to canvas)
  - Range: 0.1 to 3.0
  - Default: 1.0
  - Validation: Must be finite, positive number
  
- `offsetX: number` - Horizontal offset in pixels from canvas center (0 = centered)
  - Range: -canvasSize/2 to canvasSize/2
  - Default: 0
  - Validation: Must be finite number
  
- `offsetY: number` - Vertical offset in pixels from canvas center (0 = centered)
  - Range: -canvasSize/2 to canvasSize/2
  - Default: 0
  - Validation: Must be finite number
  
- `imageUrl: string | null` - Source image URL (data URL for uploads, HTTP URL for remote images)
  - Default: null (initialized to DEFAULT_IMAGE_URL if null)
  - Validation: Must be valid URL or data URL
  
- `transformedImageData: ImageData | null` - Transformed image as ImageData (canvas-sized)
  - Default: null
  - Validation: Must be valid ImageData with width/height matching canvasSize
  
- `canvasSize: number` - Target canvas size for image rendering (square)
  - Default: 480
  - Validation: Must be positive, finite number
  
- `isLoading: boolean` - Whether image is currently being loaded or transformed
  - Default: false
  
- `error: string | null` - Error message if operation failed
  - Default: null
  - Validation: String or null

**Relationships**:
- Belongs to: ImageTransformContext (singleton per application)
- Produces: TransformedImageData used by QR generation components

**State Transitions**:
1. **Initial State**: `imageUrl = null` → Auto-initialize to DEFAULT_IMAGE_URL
2. **Upload Start**: `isLoading = true`, `error = null`
3. **Upload Success**: `imageUrl = dataUrl`, `isLoading = false`, auto-calculate scale, reset offsets
4. **Upload Failure**: `isLoading = false`, `error = "Failed to read image file"`
5. **URL Load Start**: `isLoading = true`, `error = null`
6. **URL Load Success**: `imageUrl = url`, `isLoading = false`, auto-calculate scale, reset offsets
7. **URL Load Failure**: `isLoading = false`, `error = "Failed to load image: {reason}"`
8. **Transform Start**: `isLoading = true` (when scale/offset/canvasSize changes)
9. **Transform Success**: `transformedImageData = ImageData`, `isLoading = false`
10. **Transform Failure**: `isLoading = false`, `error = "Failed to transform image: {reason}"`, `transformedImageData = null`
11. **New Image During Load**: Cancel previous operation, start new operation

---

### ImageSource

Represents the source of an image (file upload or URL).

**Types**:
- `FileUpload`: Local file selected by user
  - `file: File` - Browser File object
  - `size: number` - File size in bytes (must be <= 10MB)
  - `type: string` - MIME type (must start with "image/")
  
- `URLSource`: Remote image URL
  - `url: string` - HTTP/HTTPS URL
  - `corsEnabled: boolean` - Whether CORS is enabled (affects loading)

**Validation Rules**:
- File uploads:
  - File size must be <= 10MB (10 * 1024 * 1024 bytes)
  - File type must start with "image/"
  - Supported formats: JPEG, PNG, GIF, WebP
  
- URL sources:
  - Must be valid HTTP/HTTPS URL
  - Must be accessible (CORS may restrict)
  - Must return image content type

**State Transitions**:
1. **File Selected**: Validate file → If valid, create FileUpload source → Process
2. **File Invalid**: Show error, reject upload
3. **URL Entered**: Validate URL → If valid, create URLSource → Load
4. **URL Invalid**: Show error, reject load

---

### ImageDimensions

Represents image dimensions and validation.

**Fields**:
- `width: number` - Image width in pixels
  - Validation: Must be positive, finite number
  
- `height: number` - Image height in pixels
  - Validation: Must be positive, finite number
  
- `maxDimension: number` - Maximum of width and height
  - Validation: Must be <= 4096 (auto-scale if exceeded)

**Validation Rules**:
- Dimensions > 4096x4096: Automatically scale down to fit within 4096x4096
- Aspect ratio preserved during scaling
- If scaling fails: Show error message

**State Transitions**:
1. **Image Loaded**: Extract dimensions → Validate → If >4096, scale down → Continue
2. **Scaling Required**: Calculate scale factor → Apply scaling → Validate result
3. **Scaling Failed**: Show error, reject image

---

### TransformationParameters

Represents the parameters for image transformation.

**Fields**:
- `scale: number` - Scale factor (multiplicative for canvas)
  - Range: 0.1 to 3.0
  - Default: Auto-calculated based on image dimensions
  
- `offsetX: number` - Horizontal offset in pixels
  - Range: -canvasSize/2 to canvasSize/2
  - Default: 0
  
- `offsetY: number` - Vertical offset in pixels
  - Range: -canvasSize/2 to canvasSize/2
  - Default: 0

**Validation Rules**:
- Scale must be finite, positive number (clamped to 0.1-3.0)
- Offsets can be any finite number (image clipped to canvas bounds during rendering)
- Parameters are validated before transformation

**State Transitions**:
1. **Parameter Changed**: Validate → Trigger transformation → Update preview
2. **New Image Loaded**: Reset to defaults (auto-calculate scale, offsets to 0)

---

### TransformedImage

Represents the final transformed image ready for QR generation.

**Fields**:
- `imageData: ImageData` - Canvas ImageData representation
  - Width/Height: canvasSize x canvasSize
  - Format: RGBA (opaque, white background for transparent areas)
  
- `canvasSize: number` - Size of the canvas (square)
  - Must match imageData dimensions

**Validation Rules**:
- ImageData must be valid (non-null, correct dimensions)
- All pixels must be opaque (alpha = 255)
- Dimensions must match canvasSize

**Relationships**:
- Produced by: ImageTransformContext transformation
- Consumed by: QArt and halftone QR generation components

---

## Validation Rules Summary

### File Upload Validation
1. File size <= 10MB (reject with error if exceeded)
2. File type starts with "image/" (reject with error if not)
3. Supported formats: JPEG, PNG, GIF, WebP

### Image Dimension Validation
1. After image load, check dimensions
2. If max(width, height) > 4096: Auto-scale down preserving aspect ratio
3. If scaling fails: Show error, reject image

### Transformation Validation
1. Scale: Clamped to 0.1-3.0, must be finite and positive
2. Offsets: Can be any finite number (clipping handled during rendering)
3. Canvas size: Must be positive, finite number

### Error Handling
1. Network failures: Show error message, no automatic retry
2. CORS failures: Show specific CORS error message
3. File read failures: Show file read error message
4. Transformation failures: Show transformation error message

---

## State Machine

```
[Initial] 
  → [Image Selected/URL Entered]
    → [Validating]
      → [Valid] → [Loading]
        → [Loaded] → [Transforming]
          → [Transformed] → [Ready]
          → [Transform Error] → [Error State]
        → [Load Error] → [Error State]
      → [Invalid] → [Error State]
  → [New Operation During Load] → [Cancelled] → [New Operation Started]
```

**Cancellation Rules**:
- When new upload/load starts: Cancel previous operation immediately
- FileReader: Ignore result if new operation started (track via ref)
- URL loading: Use AbortController to cancel fetch

---

## Data Flow

1. **Upload Flow**:
   ```
   User selects file
   → Validate file size/type
   → If invalid: Show error
   → If valid: FileReader.readAsDataURL
   → Set imageUrl to data URL
   → Load image via loadImage()
   → Validate dimensions
   → Auto-calculate scale
   → Transform to ImageData
   → Update transformedImageData
   ```

2. **URL Load Flow**:
   ```
   User enters URL
   → Validate URL format
   → If invalid: Show error
   → If valid: loadImage(url) with AbortController
   → On success: Set imageUrl
   → Validate dimensions
   → Auto-calculate scale
   → Transform to ImageData
   → Update transformedImageData
   → On error: Show error message
   ```

3. **Transform Flow**:
   ```
   User adjusts scale/offset
   → Validate parameters
   → Transform image to canvas
   → Fill canvas with white background
   → Draw image with scale/offset
   → Clip to canvas bounds
   → Convert to ImageData
   → Update transformedImageData
   → Update preview
   ```

