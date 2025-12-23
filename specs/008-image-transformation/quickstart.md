# Quickstart: Image Transformation and Upload

**Feature**: 008-image-transformation  
**Date**: 2025-01-27

## Overview

This guide provides a quick start for implementing image upload and transformation features. The infrastructure is mostly in place; this guide focuses on the enhancements needed to meet the specification requirements.

## Current State

### ✅ Already Implemented

- Image upload via FileReader API (`useImageUpload` hook)
- Image loading from URLs (`loadImage` function)
- Image transformation to canvas (`transformImageToCanvas` function)
- Transformation state management (`ImageTransformContext`)
- UI components (`ImageUploadControls`, `ImageTransformControls`)
- Transparency handling (white background fill)
- Auto-scale calculation (`calculateAppropriateCanvasScale`)

### ⚠️ Needs Enhancement

- File size validation (10MB limit)
- Image dimension validation (4096x4096 limit with auto-scaling)
- Improved error handling and messages
- Cancellation of in-progress operations
- CORS error handling improvements

## Implementation Steps

### Step 1: Add File Size Validation

**Location**: `src/domain/image/index.ts` or new `src/domain/image/validation.ts`

**Function to add**:
```typescript
export function validateFileSize(
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB
): FileSizeValidationResult {
  const sizeBytes = file.size;
  const isValid = sizeBytes <= maxSizeBytes;
  
  return {
    isValid,
    error: isValid ? null : `File size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${maxSizeBytes / 1024 / 1024}MB)`,
    sizeBytes,
    maxSizeBytes
  };
}
```

**Integration**: Call before `FileReader.readAsDataURL()` in `handleImageUpload`

### Step 2: Add File Type Validation

**Location**: `src/domain/image/validation.ts`

**Function to add**:
```typescript
export function validateFileType(
  file: File,
  supportedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
): FileTypeValidationResult {
  const mimeType = file.type;
  const isValid = mimeType.startsWith('image/') && supportedTypes.includes(mimeType);
  
  return {
    isValid,
    error: isValid ? null : `File type "${mimeType}" is not supported. Supported types: ${supportedTypes.join(', ')}`,
    mimeType,
    supportedTypes
  };
}
```

**Integration**: Call before `FileReader.readAsDataURL()` in `handleImageUpload`

### Step 3: Add Dimension Validation with Auto-Scaling

**Location**: `src/domain/image/validation.ts`

**Function to add**:
```typescript
export async function validateImageDimensions(
  image: HTMLImageElement,
  maxDimension: number = 4096
): Promise<DimensionValidationResult> {
  const originalWidth = image.width;
  const originalHeight = image.height;
  const maxImageDimension = Math.max(originalWidth, originalHeight);
  
  if (maxImageDimension <= maxDimension) {
    return {
      isValid: true,
      scaledImage: null,
      error: null,
      originalWidth,
      originalHeight,
      scaledWidth: originalWidth,
      scaledHeight: originalHeight
    };
  }
  
  // Calculate scale to fit within maxDimension
  const scale = maxDimension / maxImageDimension;
  const scaledWidth = Math.floor(originalWidth * scale);
  const scaledHeight = Math.floor(originalHeight * scale);
  
  try {
    // Create scaled image using canvas
    const canvas = document.createElement('canvas');
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
    
    // Convert back to HTMLImageElement
    const scaledImage = new Image();
    scaledImage.src = canvas.toDataURL();
    
    await new Promise((resolve, reject) => {
      scaledImage.onload = resolve;
      scaledImage.onerror = reject;
    });
    
    return {
      isValid: true,
      scaledImage,
      error: null,
      originalWidth,
      originalHeight,
      scaledWidth,
      scaledHeight
    };
  } catch (err) {
    return {
      isValid: false,
      scaledImage: null,
      error: `Failed to scale image: ${err instanceof Error ? err.message : 'unknown error'}`,
      originalWidth,
      originalHeight,
      scaledWidth: originalWidth,
      scaledHeight: originalHeight
    };
  }
}
```

**Integration**: Call after `loadImage()` succeeds, before transformation

### Step 4: Enhance Error Handling

**Location**: `src/state/image/ImageTransformContext.tsx`

**Enhancements**:
1. Add specific error messages for different failure types:
   - File size exceeded
   - Invalid file type
   - File read error
   - Invalid URL
   - CORS error
   - Network error
   - Dimension scaling failed
   - Transformation failed

2. Update `handleImageUpload` to use validation functions:
```typescript
const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  const typeValidation = validateFileType(file);
  if (!typeValidation.isValid) {
    setError(typeValidation.error || 'Invalid file type');
    return;
  }

  // Validate file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.isValid) {
    setError(sizeValidation.error || 'File size too large');
    return;
  }

  // Cancel previous operation if in progress
  // (track via ref or state)

  setIsLoading(true);
  setError(null);

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result;
    if (typeof dataUrl === "string") {
      setImageUrl(dataUrl);
    }
  };
  reader.onerror = () => {
    setError("Failed to read image file");
    setIsLoading(false);
  };
  reader.readAsDataURL(file);
}, []);
```

### Step 5: Implement Cancellation

**Location**: `src/state/image/ImageTransformContext.tsx`

**For File Uploads**:
- Track in-progress upload via ref
- Check ref before processing FileReader result
- Ignore result if new upload started

**For URL Loading**:
- Use AbortController with fetch API
- Update `loadImage` to accept AbortSignal
- Cancel previous AbortController when new load starts

**Example**:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const handleImageUrlChange = useCallback((url: string) => {
  // Cancel previous load
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Create new AbortController
  const abortController = new AbortController();
  abortControllerRef.current = abortController;
  
  setIsLoading(true);
  setError(null);
  
  loadImage(url, abortController.signal)
    .then((img) => {
      // Validate dimensions
      return validateImageDimensions(img);
    })
    .then((validation) => {
      if (!validation.isValid) {
        throw new Error(validation.error || 'Dimension validation failed');
      }
      
      const imageToUse = validation.scaledImage || img;
      // Continue with transformation...
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        // Operation was cancelled, ignore
        return;
      }
      setError(err.message || 'Failed to load image');
      setIsLoading(false);
    });
}, []);
```

### Step 6: Update loadImage Function

**Location**: `src/domain/image/index.ts`

**Enhancement**: Add AbortSignal support:
```typescript
export async function loadImage(
  imageUrl: string,
  signal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    
    const abortHandler = () => {
      img.src = ''; // Cancel image load
      reject(new DOMException('Aborted', 'AbortError'));
    };
    
    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }
    
    img.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      resolve(img);
    };
    
    img.onerror = (err) => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      // Determine error type
      if (imageUrl.startsWith('http') && !imageUrl.includes('data:')) {
        // Likely CORS error
        reject(new Error('Failed to load image: CORS restrictions'));
      } else {
        reject(new Error('Failed to load image: invalid URL or network error'));
      }
    };
    
    img.src = imageUrl;
  });
}
```

## Testing Checklist

- [ ] File size validation rejects files >10MB
- [ ] File type validation rejects non-image files
- [ ] File type validation accepts JPEG, PNG, GIF, WebP
- [ ] Dimension validation auto-scales images >4096x4096
- [ ] Dimension validation preserves aspect ratio
- [ ] Error messages display correctly for each error type
- [ ] File upload cancellation works (new upload cancels previous)
- [ ] URL load cancellation works (new load cancels previous)
- [ ] CORS errors display specific message
- [ ] Network errors display appropriate message
- [ ] Loading states display correctly
- [ ] Transformation preview updates within 100ms
- [ ] Transparency converted to white background

## Performance Targets

- File size validation: <1ms (synchronous)
- File type validation: <1ms (synchronous)
- Dimension validation: <500ms for images up to 4096x4096
- Image upload: <2s for images up to 10MB
- Image URL loading: <5s for typical sizes
- Transformation preview: <100ms after parameter change
- Error message display: <200ms after failure

## Integration Points

### With QArt Generation
- `transformedImageData` from `ImageTransformContext` is used directly
- No changes needed to QArt components

### With Halftone Generation
- `transformedImageData` from `ImageTransformContext` is used directly
- No changes needed to halftone components

### With QR Canvas
- `transformedImageData` can be used for preview rendering
- No changes needed to QR canvas components

## Common Pitfalls

1. **FileReader doesn't support cancellation**: Use ref tracking to ignore results if new upload started
2. **Image dimensions unknown until load**: Validate dimensions after `loadImage()` succeeds
3. **Canvas memory limits**: Large images may hit browser memory limits; scaling helps
4. **CORS restrictions**: Remote images may fail due to CORS; provide clear error message
5. **AbortController timing**: Attach abort handler before setting `img.src`

## Next Steps

After implementing these enhancements:
1. Run tests to verify all requirements met
2. Test with various image sizes and formats
3. Test cancellation scenarios
4. Verify error messages are user-friendly
5. Check performance targets are met

