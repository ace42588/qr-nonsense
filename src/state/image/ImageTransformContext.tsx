import { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback, ReactNode, JSX } from "react";
import { calculateAppropriateCanvasScale, convertTransparencyToWhite } from "@/domain/image";
import { loadImage, transformImageToCanvas } from "@/adapters/browser/image";

const DEFAULT_IMAGE_URL = "/defcon_k_skull-reg_cropped.jpg";

interface ImageTransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  imageUrl: string | null;
  transformedImageData: ImageData | null;
  canvasSize: number;
  isLoading: boolean;
  error: string | null;
}

interface ImageTransformContextValue extends ImageTransformState {
  setScale: (scale: number) => void;
  setOffsetX: (offsetX: number) => void;
  setOffsetY: (offsetY: number) => void;
  setImageUrl: (imageUrl: string | null) => void;
  setCanvasSize: (canvasSize: number) => void;
  // Image upload handling
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  // Source image for offscreen canvas transformation
  sourceImage: HTMLImageElement | null;
}

const ImageTransformContext = createContext<ImageTransformContextValue | null>(null);

interface ImageTransformProviderProps {
  children: ReactNode;
}

export function ImageTransformProvider({ children }: ImageTransformProviderProps): JSX.Element {
  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [transformedImageData, setTransformedImageData] = useState<ImageData | null>(null);
  const [canvasSize, setCanvasSize] = useState(480);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the last processed image URL to only auto-calculate on new images
  const lastProcessedImageUrlRef = useRef<string | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the canvas size when scale was last calculated, to maintain scale relative to QR code
  // Initialize to 0 - will be set when image is first loaded
  // This ensures we use a stable reference size that doesn't change when switching components
  const referenceCanvasSizeRef = useRef<number>(0);
  // Track if we're currently adjusting scale due to canvasSize change (to avoid loops)
  const isAdjustingScaleRef = useRef<boolean>(false);

  // Initialize with default image URL if not set
  useEffect(() => {
    if (!imageUrl) {
      setImageUrl(DEFAULT_IMAGE_URL);
    }
  }, [imageUrl]);

  // Handle image file upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl === "string") {
        setImageUrl(dataUrl);
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  }, []);


  // Wrapper for setScale that updates reference canvas size when user manually changes scale
  const setScaleWithReference = useCallback((newScale: number) => {
    setScale(newScale);
    // Update reference when user manually changes scale (not during automatic adjustment)
    if (!isAdjustingScaleRef.current) {
      referenceCanvasSizeRef.current = canvasSize;
    }
  }, [canvasSize]);

  // NOTE: Auto-scaling on window resize has been removed per user request.
  // The image should only scale/resize when first loaded, not when the window resizes.
  // The reference canvas size is still tracked for initial image loading.

  // Transform image whenever imageUrl, scale, or offset changes
  // NOTE: canvasSize is NOT in dependencies - we use a fixed reference size to prevent
  // image scale from changing when switching between components (which have different canvas sizes)
  // The visible canvas size is handled by CSS scaling, not by retransforming the image
  useEffect(() => {
    let isMounted = true;
    
    async function transformImage() {
      if (!imageUrl) {
        setTransformedImageData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load source image if needed
        const isNewImage = !sourceImageRef.current || sourceImageRef.current.src !== imageUrl;
        if (isNewImage) {
          const img = await loadImage(imageUrl);
          if (!isMounted) return;
          sourceImageRef.current = img;
          
          // Auto-calculate scale for new images using reference canvas size
          if (lastProcessedImageUrlRef.current !== imageUrl) {
            // Set reference canvas size on first image load
            // Use a fixed standard size (480) to ensure consistency across all modes
            // This prevents scale inconsistency when switching between components with different canvas sizes
            if (referenceCanvasSizeRef.current === 0) {
              referenceCanvasSizeRef.current = 480; // Fixed standard size
            }
            
            const calculatedScale = calculateAppropriateCanvasScale(
              img.width,
              img.height,
              referenceCanvasSizeRef.current
            );

            isAdjustingScaleRef.current = true;
            setScale(calculatedScale);
            setOffsetX(0);
            setOffsetY(0);
            lastProcessedImageUrlRef.current = imageUrl;
            setTimeout(() => {
              isAdjustingScaleRef.current = false;
            }, 0);
          }
        }

        const img = sourceImageRef.current;
        if (!img) {
          if (isMounted) {
            setError("Image not loaded");
            setIsLoading(false);
          }
          return;
        }
        
        // Use reference canvas size for transformation to keep image scale consistent
        // This prevents the image from changing scale when switching between components
        // Always use the fixed reference size (480) to ensure consistency
        const transformSize = referenceCanvasSizeRef.current || 480;
        
        // Transform image to reference canvas size (not current canvasSize)
        // This ensures the image scale remains consistent when switching components
        const transformed = await transformImageToCanvas(
          img,
          transformSize,
          scale,
          offsetX,
          offsetY
        );

        // Convert transparency to white background before QArt processing (FR-028)
        const finalImageData = convertTransparencyToWhite(transformed);

        if (isMounted) {
          setTransformedImageData(finalImageData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error transforming image:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to transform image");
          setIsLoading(false);
          setTransformedImageData(null);
        }
      }
    }

    transformImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, scale, offsetX, offsetY]); // Removed canvasSize from dependencies

  // Reset tracking when image URL changes
  useEffect(() => {
    if (imageUrl !== lastProcessedImageUrlRef.current) {
      // New image - reset will happen in autoCalculateScale
      lastProcessedImageUrlRef.current = null;
      sourceImageRef.current = null;
    }
  }, [imageUrl]);

  const value: ImageTransformContextValue = useMemo(() => ({
    scale,
    offsetX,
    offsetY,
    imageUrl,
    transformedImageData,
    canvasSize,
    isLoading,
    error,
    setScale: setScaleWithReference,
    setOffsetX,
    setOffsetY,
    setImageUrl,
    setCanvasSize,
    fileInputRef,
    handleImageUpload,
    sourceImage: sourceImageRef.current,
  }), [scale, offsetX, offsetY, imageUrl, transformedImageData, canvasSize, isLoading, error, handleImageUpload, setScaleWithReference]);

  return (
    <ImageTransformContext.Provider value={value}>
      {children}
    </ImageTransformContext.Provider>
  );
}

export function useImageTransform(): ImageTransformContextValue {
  const context = useContext(ImageTransformContext);
  if (!context) {
    throw new Error("useImageTransform must be used within ImageTransformProvider");
  }
  return context;
}

