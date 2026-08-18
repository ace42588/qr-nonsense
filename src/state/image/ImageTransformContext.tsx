import { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback, ReactNode, JSX } from "react";
import {
  calculateAppropriateCanvasScale,
  convertTransparencyToWhite,
  validateImageFile,
  MAX_IMAGE_DIMENSION,
} from "@/domain/image";
import { loadImage, transformImageToCanvas, downscaleImageDataUrl } from "@/adapters/browser/image";
import { decodeAnimatedImage } from "@/adapters/browser/animation";

const DEFAULT_IMAGE_URL = "/sample-mark.png";

interface ImageTransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  imageUrl: string | null;
  transformedImageData: ImageData | null;
  canvasSize: number;
  isLoading: boolean;
  error: string | null;
  sourceFrames: ImageData[];
  frames: ImageData[];
  frameDelaysMs: number[];
  isAnimated: boolean;
  animationWarning: string | null;
}

interface ImageTransformContextValue extends ImageTransformState {
  setScale: (scale: number) => void;
  setOffsetX: (offsetX: number) => void;
  setOffsetY: (offsetY: number) => void;
  setImageUrl: (imageUrl: string | null) => void;
  setCanvasSize: (canvasSize: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  const [sourceFrames, setSourceFrames] = useState<ImageData[]>([]);
  const [frames, setFrames] = useState<ImageData[]>([]);
  const [frameDelaysMs, setFrameDelaysMs] = useState<number[]>([]);
  const [animationWarning, setAnimationWarning] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);

  const lastProcessedImageUrlRef = useRef<string | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const sourceFramesRef = useRef<ImageData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadReaderRef = useRef<FileReader | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const referenceCanvasSizeRef = useRef<number>(0);
  const isAdjustingScaleRef = useRef<boolean>(false);

  useEffect(() => {
    if (!imageUrl) {
      setImageUrl(DEFAULT_IMAGE_URL);
    }
  }, [imageUrl]);

  const replaceImageUrl = useCallback((nextUrl: string | null) => {
    if (blobUrlRef.current && blobUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setImageUrl(nextUrl);
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    if (uploadReaderRef.current) {
      uploadReaderRef.current.abort();
      uploadReaderRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    const keepOriginalBytes = isAnimationContainerFile(file);

    if (keepOriginalBytes) {
      const url = URL.createObjectURL(file);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setImageUrl(url);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    uploadReaderRef.current = reader;
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result;
        if (typeof dataUrl !== "string") {
          setError("Failed to read image file");
          setIsLoading(false);
          return;
        }
        const processed = await downscaleImageDataUrl(dataUrl, MAX_IMAGE_DIMENSION);
        replaceImageUrl(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process image");
        setIsLoading(false);
      } finally {
        if (uploadReaderRef.current === reader) {
          uploadReaderRef.current = null;
        }
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file");
      setIsLoading(false);
      uploadReaderRef.current = null;
    };
    reader.onabort = () => {
      if (uploadReaderRef.current === reader) {
        uploadReaderRef.current = null;
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, [replaceImageUrl]);

  const setScaleWithReference = useCallback((newScale: number) => {
    setScale(newScale);
    if (!isAdjustingScaleRef.current) {
      referenceCanvasSizeRef.current = canvasSize;
    }
  }, [canvasSize]);

  const applyAutoScale = useCallback((width: number, height: number, url: string) => {
    if (lastProcessedImageUrlRef.current === url) return;
    if (referenceCanvasSizeRef.current === 0) {
      referenceCanvasSizeRef.current = 480;
    }
    const calculatedScale = calculateAppropriateCanvasScale(
      width,
      height,
      referenceCanvasSizeRef.current
    );
    isAdjustingScaleRef.current = true;
    setScale(calculatedScale);
    setOffsetX(0);
    setOffsetY(0);
    lastProcessedImageUrlRef.current = url;
    setTimeout(() => {
      isAdjustingScaleRef.current = false;
    }, 0);
  }, []);

  // Load source still or animation frames when the URL changes.
  useEffect(() => {
    if (!imageUrl) return;
    const url = imageUrl;

    loadAbortRef.current?.abort();
    const abortController = new AbortController();
    loadAbortRef.current = abortController;
    let isMounted = true;

    lastProcessedImageUrlRef.current = null;
    sourceImageRef.current = null;
    sourceFramesRef.current = [];
    setSourceImage(null);
    setSourceFrames([]);
    setFrames([]);
    setFrameDelaysMs([]);
    setAnimationWarning(null);

    async function loadSource() {
      setIsLoading(true);
      setError(null);
      try {
        let decodedAnimation: Awaited<
          ReturnType<typeof decodeAnimatedImage>
        > | null = null;
        try {
          const response = await fetch(url, { signal: abortController.signal });
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            decodedAnimation = await decodeAnimatedImage(buffer);
          }
        } catch {
          if (abortController.signal.aborted) return;
          // Fall back to <img> for stills / CORS-limited URLs.
        }

        if (abortController.signal.aborted || !isMounted) return;

        if (decodedAnimation && decodedAnimation.frames.length > 1) {
          sourceFramesRef.current = decodedAnimation.frames;
          sourceImageRef.current = null;
          setSourceFrames(decodedAnimation.frames);
          setFrameDelaysMs(decodedAnimation.delaysMs);
          setAnimationWarning(decodedAnimation.warning);
          setSourceImage(null);
          applyAutoScale(
            decodedAnimation.frames[0].width,
            decodedAnimation.frames[0].height,
            url
          );
          return;
        }

        const img = await loadImage(url);
        if (abortController.signal.aborted || !isMounted) return;
        sourceImageRef.current = img;
        sourceFramesRef.current = [];
        setSourceImage(img);
        setSourceFrames([]);
        setFrameDelaysMs([]);
        setAnimationWarning(null);
        applyAutoScale(img.width, img.height, url);
      } catch (err) {
        if (abortController.signal.aborted || !isMounted) return;
        console.error("Error loading image:", err);
        setError(err instanceof Error ? err.message : "Failed to load image");
        setIsLoading(false);
      }
    }

    loadSource();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [imageUrl, applyAutoScale]);

  // Transform still image or every animation frame when source/transform changes.
  useEffect(() => {
    let isMounted = true;

    async function transform() {
      const animationFrames = sourceFramesRef.current;
      const img = sourceImageRef.current;
      if (!imageUrl || (!img && animationFrames.length === 0)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const transformSize = referenceCanvasSizeRef.current || 480;

        if (animationFrames.length > 1) {
          const transformed: ImageData[] = [];
          for (const frame of animationFrames) {
            const drawn = await transformImageToCanvas(
              frame,
              transformSize,
              scale,
              offsetX,
              offsetY
            );
            transformed.push(convertTransparencyToWhite(drawn));
          }
          if (!isMounted) return;
          setFrames(transformed);
          setTransformedImageData(transformed[0] ?? null);
          setIsLoading(false);
          return;
        }

        if (!img) {
          if (isMounted) {
            setError("Image not loaded");
            setIsLoading(false);
          }
          return;
        }

        const drawn = await transformImageToCanvas(
          img,
          transformSize,
          scale,
          offsetX,
          offsetY
        );
        const finalImageData = convertTransparencyToWhite(drawn);
        if (!isMounted) return;
        setFrames([]);
        setTransformedImageData(finalImageData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error transforming image:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to transform image");
          setIsLoading(false);
          setTransformedImageData(null);
          setFrames([]);
        }
      }
    }

    transform();
    return () => {
      isMounted = false;
    };
  }, [imageUrl, sourceImage, sourceFrames, scale, offsetX, offsetY]);

  const isAnimated = sourceFrames.length > 1;

  const value: ImageTransformContextValue = useMemo(() => ({
    scale,
    offsetX,
    offsetY,
    imageUrl,
    transformedImageData,
    canvasSize,
    isLoading,
    error,
    sourceFrames,
    frames,
    frameDelaysMs,
    isAnimated,
    animationWarning,
    setScale: setScaleWithReference,
    setOffsetX,
    setOffsetY,
    setImageUrl: replaceImageUrl,
    setCanvasSize,
    fileInputRef,
    handleImageUpload,
    sourceImage,
  }), [
    scale,
    offsetX,
    offsetY,
    imageUrl,
    transformedImageData,
    canvasSize,
    isLoading,
    error,
    sourceFrames,
    frames,
    frameDelaysMs,
    isAnimated,
    animationWarning,
    handleImageUpload,
    setScaleWithReference,
    replaceImageUrl,
    sourceImage,
  ]);

  return (
    <ImageTransformContext.Provider value={value}>
      {children}
    </ImageTransformContext.Provider>
  );
}

function isAnimationContainerFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "image/gif" ||
    type === "image/webp" ||
    name.endsWith(".gif") ||
    name.endsWith(".webp")
  );
}

export function useImageTransform(): ImageTransformContextValue {
  const context = useContext(ImageTransformContext);
  if (!context) {
    throw new Error("useImageTransform must be used within ImageTransformProvider");
  }
  return context;
}
