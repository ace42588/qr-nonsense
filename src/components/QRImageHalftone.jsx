import React, { useState, useCallback, useRef } from "react";
import { QRBase } from "./QRBase";
import { generatePatterns, choosePattern } from "@/domain/halftone/patterns";
import { loadImage, drawImage, getImageData, computeImportanceMap, getBrightness } from "@/domain/halftone/image";
import { useQRDataDispatch } from "@/state/qr/QRDataContext";

// Default placeholder image - a simple data URL for a 1x1 transparent pixel
const DEFAULT_IMAGE_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function QRImageHalftone({
  imageUrl: initialImageUrl,
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module
}) {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const [imageUrl, setImageUrl] = useState(initialImageUrl || DEFAULT_IMAGE_URL);
  const fileInputRef = useRef(null);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [scale, setScale] = useState(1);
  const [alpha, setAlpha] = useState(0.5); // New: alpha for importance map
  const [canvasSize, setCanvasSize] = useState(initialSize);
  const [imgData, setImgData] = useState(null);
  const [importanceMap, setImportanceMap] = useState(null);
  const [reliabilityWeight, setReliabilityWeight] = useState(0.01);
  const [imageError, setImageError] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Generate patterns
  const patternsDark = React.useMemo(() => generatePatterns(1), []);
  const patternsLight = React.useMemo(() => generatePatterns(0), []);

  // Precompute image data and importance map when image/transform/size/alpha changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadAndProcessImage() {
      if (!imageUrl) {
        setImageError("No image URL provided");
        setIsLoadingImage(false);
        return;
      }

      setIsLoadingImage(true);
      setImageError(null);
      
      try {
        const loadedImg = await loadImage(imageUrl);
        if (!isMounted) return;
        
        // Create temporary canvas to draw the image
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvasSize;
        tempCanvas.height = canvasSize;
        const ctx = tempCanvas.getContext("2d");
        
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }
        
        // Draw image centered
        const drawX = canvasSize / 2 - (loadedImg.width * scale) / 2 + x;
        const drawY = canvasSize / 2 - (loadedImg.height * scale) / 2 + y;
        drawImage(ctx, loadedImg, drawX, drawY, scale);
        
        // Get image data and importance map
        const _imgData = getImageData(ctx, canvasSize, canvasSize);
        const _importanceMap = computeImportanceMap(_imgData, canvasSize, alpha);
        
        if (isMounted) {
          setImgData(_imgData);
          setImportanceMap(_importanceMap);
          setImageError(null);
          setIsLoadingImage(false);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        if (isMounted) {
          let errorMessage = "Failed to load image.";
          
          if (error instanceof Error) {
            if (error.message.includes("CORS")) {
              errorMessage = "CORS error: Image cannot be loaded due to cross-origin restrictions. Please use a different image URL or host the image on the same domain.";
            } else if (error.message.includes("404") || error.message.includes("Not Found")) {
              errorMessage = "Image not found. Please check the image URL.";
            } else if (error.message.includes("network") || error.message.includes("fetch")) {
              errorMessage = "Network error: Unable to fetch image. Please check your connection and try again.";
            } else {
              errorMessage = `Error loading image: ${error.message}`;
            }
          }
          
          setImageError(errorMessage);
          setIsLoadingImage(false);
          setImgData(null);
          setImportanceMap(null);
        }
      }
    }
    loadAndProcessImage();
    return () => {
      isMounted = false;
    };
  }, [imageUrl, canvasSize, x, y, scale, alpha]);

  // Render module with halftone pattern, using precomputed image data and importance map
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!imgData || !importanceMap) return;
    const { size } = renderCtx;
    // Sample at the center of the module (including quiet zone)
    const centerX = Math.floor(moduleX + moduleSize / 2);
    const centerY = Math.floor(moduleY + moduleSize / 2);
    // Clamp to canvas bounds
    const safeX = Math.max(0, Math.min(centerX, size - 1));
    const safeY = Math.max(0, Math.min(centerY, size - 1));
    const idx = (safeY * size + safeX) * 4;
    const r = imgData.data[idx];
    const g = imgData.data[idx + 1];
    const b = imgData.data[idx + 2];
    const brightness = getBrightness(r, g, b) / 255;
    const importance = importanceMap[safeY * size + safeX] || 0;
    if (module.nonData) {
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }
    // Choose and draw pattern
    const patterns = module.isDark ? patternsDark : patternsLight;
    const pattern = choosePattern(patterns, brightness, importance, reliabilityWeight);
    const subSize = moduleSize / modulePixel;
    for (let sy = 0; sy < modulePixel; ++sy) {
      for (let sx = 0; sx < modulePixel; ++sx) {
        ctx.fillStyle = pattern[sy][sx] ? "#111" : "#fff";
        ctx.fillRect(
          moduleX + sx * subSize,
          moduleY + sy * subSize,
          subSize,
          subSize
        );
      }
    }
    // Note: Highlighting is handled by QRBase after renderModule is called
  }, [imgData, importanceMap, modulePixel, reliabilityWeight, patternsDark, patternsLight]);

  // Handle image file upload
  const handleImageUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.error('Selected file is not an image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageUrl(result);
      }
    };
    reader.onerror = () => {
      console.error('Error reading image file');
    };
    reader.readAsDataURL(file);
  }, []);

  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCallback((ctx, m, moduleX, moduleY, moduleSize, renderCtx) => {
    if (canvasSize !== renderCtx.size) setCanvasSize(renderCtx.size);
    renderModule(ctx, m, moduleX, moduleY, moduleSize, renderCtx);
  }, [canvasSize, renderModule]);

  const handleModuleHover = useCallback((module) => {
    if (module?.bit?.id) {
      highlightModules([module.bit.id]);
    } else if (module === null) {
      // Mouse left the canvas
      clearHighlightedModules([]);
    }
  }, [highlightModules, clearHighlightedModules]);

  return (
    <>
      {imageError && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: 8,
          color: '#991b1b'
        }}>
          <strong>Image Error:</strong> {imageError}
        </div>
      )}
      {isLoadingImage && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#dbeafe',
          border: '1px solid #3b82f6',
          borderRadius: 8,
          color: '#1e40af',
          textAlign: 'center'
        }}>
          Loading image...
        </div>
      )}
      <QRBase
        size={initialSize}
        renderModule={handleBaseRender}
        onModuleHover={handleModuleHover}
        responsive={true}
      />
      <div style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Image Adjustments</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Image:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Image URL:</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL or upload file"
              style={{ flex: 1, padding: '4px 8px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Position X:</label>
            <input
              type="range"
              min={-canvasSize / 2}
              max={canvasSize / 2}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 40, textAlign: 'right' }}>{Math.round(x)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Position Y:</label>
            <input
              type="range"
              min={-canvasSize / 2}
              max={canvasSize / 2}
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 40, textAlign: 'right' }}>{Math.round(y)}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Alpha:</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 40, textAlign: 'right' }}>{alpha.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Reliability:</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={reliabilityWeight}
              onChange={e => setReliabilityWeight(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 40, textAlign: 'right' }}>{reliabilityWeight.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  );
}