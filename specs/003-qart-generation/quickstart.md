# Quickstart: QArt QR Code Generation

**Feature**: 003-qart-generation  
**Date**: 2025-01-27

## Overview

This guide provides a quick start for developers working with QArt QR code generation. It covers basic usage, key functions, and common patterns.

## Prerequisites

- React 18.2.0+
- TypeScript 5.8.3+
- Existing QR code generation infrastructure (`src/domain/qr/`)
- Image processing utilities (`src/domain/image/`)

## Basic Usage

### Generating a QArt QR Code

```typescript
import { generateQArt } from "@/domain/qart";
import { useQRData } from "@/state/qr/QRDataContext";
import { useImageTransform } from "@/state/image/ImageTransformContext";

function MyQArtComponent() {
  const { segments, codewords, blocks, versionInfo, matrix } = useQRData();
  const { transformedImageData } = useImageTransform();
  
  const handleGenerate = async () => {
    if (!transformedImageData) {
      console.error("No image loaded");
      return;
    }
    
    try {
      const result = await generateQArt({
        segments,
        codewords,
        blocks,
        initialMatrix: matrix,
        versionInfo,
        errorCorrectionLevel: 1,
        targetImage: transformedImageData,
        minDecodeRedundancy: 0.8,
        decodeTrials: 1,
      });
      
      console.log("QArt generated:", result);
      // Use result.matrix for rendering
    } catch (error) {
      console.error("QArt generation failed:", error);
    }
  };
  
  return <button onClick={handleGenerate}>Generate QArt</button>;
}
```

### Using the QRQArt Component

```typescript
import { QRQArt } from "@/components/QRQArt";

function App() {
  return (
    <QRQArt size={480} />
  );
}
```

The `QRQArt` component automatically:
- Loads image from `ImageTransformContext`
- Gets QR data from `QRDataContext`
- Generates QArt QR code when dependencies change
- Handles loading states and errors
- Supports control matrix visualization

## Key Functions

### generateQArt(options: QArtOptions): Promise<QArtResult>

Main QArt generation function.

**Parameters**:
- `options.segments` - Input data segments
- `options.codewords` - Data and error correction codewords
- `options.blocks` - Reed-Solomon blocks
- `options.initialMatrix` - Initial QR code matrix
- `options.versionInfo` - QR code version information
- `options.errorCorrectionLevel` - Error correction level (0-3)
- `options.targetImage` - Target image (ImageData)
- `options.minDecodeRedundancy` - Minimum decode success rate (default: 0.8)
- `options.decodeTrials` - Number of decode trials (default: 1)
- `options.signal` - Optional AbortSignal for cancellation

**Returns**: Promise resolving to `QArtResult`

**Throws**: Error if generation fails or scannability verification fails

**Example**:
```typescript
const result = await generateQArt({
  segments,
  codewords,
  blocks,
  initialMatrix: matrix,
  versionInfo,
  errorCorrectionLevel: 1,
  targetImage: imageData,
});
```

### rasterizeImageToQRGrid(imageData: ImageData, qrDimension: number): Float32Array

Rasterizes transformed image to QR grid coordinates.

**Parameters**:
- `imageData` - Pre-transformed ImageData (canvas-sized)
- `qrDimension` - QR code grid dimension

**Returns**: Float32Array of brightness values (0-1) for each QR module

**Example**:
```typescript
import { rasterizeImageToQRGrid } from "@/domain/image";

const qrDimension = version * 4 + 17;
const targetGrid = rasterizeImageToQRGrid(transformedImageData, qrDimension);
```

### calculateAppropriateImageScale(imageWidth, imageHeight, qrDimension, marginFactor?): number

Calculates appropriate scale factor to fit image within QR dimensions.

**Parameters**:
- `imageWidth` - Width of source image in pixels
- `imageHeight` - Height of source image in pixels
- `qrDimension` - QR code grid dimension
- `marginFactor` - Factor to leave margin (default: 0.9)

**Returns**: Scale factor (scale > 1 zooms in, scale < 1 zooms out)

**Example**:
```typescript
import { calculateAppropriateImageScale } from "@/domain/image";

const scale = calculateAppropriateImageScale(
  image.width,
  image.height,
  qrDimension,
  0.9
);
```

## Common Patterns

### Cancellation Pattern

```typescript
const controllerRef = useRef<AbortController | null>(null);

const generateQArtCode = useCallback(async () => {
  // Cancel any ongoing generation
  if (controllerRef.current) {
    controllerRef.current.abort();
  }
  
  const controller = new AbortController();
  controllerRef.current = controller;
  
  try {
    const result = await generateQArt({
      // ... options
      signal: controller.signal,
    });
    
    if (!controller.signal.aborted && result) {
      // Use result
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      // Handle error
    }
  }
}, [/* dependencies */]);
```

### Debouncing Pattern

```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    generateQArtCode();
  }, 300); // 300ms debounce
  
  return () => {
    clearTimeout(timeoutId);
  };
}, [/* dependencies */]);
```

### Error Handling Pattern

```typescript
try {
  const result = await generateQArt(options);
  // Success
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("decode validation")) {
      // Scannability failed
    } else if (error.message.includes("No image")) {
      // Image missing
    } else {
      // Other error
    }
  }
}
```

### Version Capacity Check Pattern

```typescript
import { getVersionInfo } from "@/domain/qr/versionUtils";
import { calculateQArtCapacityRequirement } from "@/domain/qart/capacity";

function checkCapacity(version: number, userInputBits: number, imageData: ImageData) {
  const versionInfo = getVersionInfo(errorCorrectionLevel, version);
  const availableCapacity = versionInfo.capacity - userInputBits;
  
  if (availableCapacity <= 0) {
    return { hasCapacity: false, warning: "Insufficient capacity" };
  }
  
  const qrDimension = version * 4 + 17;
  const complexity = calculateImageComplexity(imageData, qrDimension);
  const qartRequirement = calculateQArtCapacityRequirement(
    complexity,
    version,
    userInputBits
  );
  
  if (availableCapacity < qartRequirement) {
    return { hasCapacity: false, warning: "Insufficient capacity for QArt" };
  }
  
  return { hasCapacity: true, warning: null };
}
```

## State Management

### Using Image Transform Context

```typescript
import { useImageTransform } from "@/state/image/ImageTransformContext";

function MyComponent() {
  const {
    transformedImageData,
    canvasSize,
    isLoading,
    error,
    setCanvasSize,
  } = useImageTransform();
  
  // transformedImageData is ready for QArt generation
  // isLoading indicates if transformation is in progress
  // error contains any transformation errors
}
```

### Using QR Data Context

```typescript
import { useQRData } from "@/state/qr/QRDataContext";

function MyComponent() {
  const {
    segments,
    codewords,
    blocks,
    versionInfo,
    matrix,
  } = useQRData();
  
  // All QR data needed for QArt generation
}
```

## Performance Considerations

1. **Debounce rapid changes**: Use 300ms debounce for parameter changes
2. **Cancel long-running operations**: Use AbortController for cancellation
3. **Memoize expensive calculations**: Use `useMemo` for derived data
4. **Optimize image processing**: Scale images before rasterization

## Testing

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { generateQArt } from "@/domain/qart";

describe("generateQArt", () => {
  it("should generate QArt QR code", async () => {
    const options = {
      segments: [/* ... */],
      codewords: [/* ... */],
      blocks: [/* ... */],
      initialMatrix: [/* ... */],
      versionInfo: { version: 1, capacity: 152, /* ... */ },
      errorCorrectionLevel: 1,
      targetImage: createTestImageData(),
    };
    
    const result = await generateQArt(options);
    
    expect(result.matrix).toBeDefined();
    expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
  });
});
```

## Troubleshooting

### "No image loaded" Error
- Ensure image is loaded in `ImageTransformContext`
- Check `transformedImageData` is not null

### "Insufficient capacity" Warning
- Increase QR code version
- Reduce user input data size
- Use Auto version mode

### "Scannability verification failed" Error
- QArt optimization may have broken QR code structure
- Try different priority function
- Increase error correction level

### Generation takes too long
- Check QR code version (larger versions take longer)
- Consider cancellation for user-initiated changes
- Optimize image size before processing

## Next Steps

- Read [data-model.md](./data-model.md) for detailed entity definitions
- Read [research.md](./research.md) for algorithm details
- Review [contracts/](./contracts/) for API specifications
- Check existing implementation in `src/domain/qart/`

