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


  // Transform image whenever imageUrl, scale, offset, or canvasSize changes
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
          
          // Auto-calculate scale for new images
          if (lastProcessedImageUrlRef.current !== imageUrl) {
            const calculatedScale = calculateAppropriateCanvasScale(
              img.width,
              img.height,
              canvasSize
            );

            setScale(calculatedScale);
            setOffsetX(0);
            setOffsetY(0);
            lastProcessedImageUrlRef.current = imageUrl;
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
        
        // Transform image to canvas size
        const transformed = await transformImageToCanvas(
          img,
          canvasSize,
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
  }, [imageUrl, scale, offsetX, offsetY, canvasSize]);

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
    setScale,
    setOffsetX,
    setOffsetY,
    setImageUrl,
    setCanvasSize,
    fileInputRef,
    handleImageUpload,
  }), [scale, offsetX, offsetY, imageUrl, transformedImageData, canvasSize, isLoading, error, handleImageUpload]);

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

