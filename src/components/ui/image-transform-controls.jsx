/**
 * Shared image transform controls component
 * Provides controls for image scale, position (offsetX, offsetY), and upload
 */

import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ImageUploadControls } from "./image-upload-controls";

export function ImageTransformControls() {
  const {
    scale,
    offsetX,
    offsetY,
    imageUrl,
    canvasSize,
    setScale,
    setOffsetX,
    setOffsetY,
    setImageUrl,
    fileInputRef,
    handleImageUpload,
  } = useImageTransform();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <ImageUploadControls
        fileInputRef={fileInputRef}
        imageUrl={imageUrl}
        onImageUrlChange={setImageUrl}
        onImageUpload={handleImageUpload}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120, color: '#666' }}>Position X:</label>
        <input
          type="range"
          min={-canvasSize / 2}
          max={canvasSize / 2}
          value={offsetX}
          onChange={(e) => setOffsetX(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 40, textAlign: 'right' }}>{Math.round(offsetX)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120, color: '#666' }}>Position Y:</label>
        <input
          type="range"
          min={-canvasSize / 2}
          max={canvasSize / 2}
          value={offsetY}
          onChange={(e) => setOffsetY(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 40, textAlign: 'right' }}>{Math.round(offsetY)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120, color: '#666' }}>Scale:</label>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.01}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 40, textAlign: 'right' }}>{scale.toFixed(2)}</span>
      </div>
    </div>
  );
}

