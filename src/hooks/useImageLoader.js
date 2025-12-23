import { useState, useEffect } from "react";
import { loadImage } from "@/domain/halftone/image";

/**
 * Shared hook for loading images with error handling
 * Returns image data, loading state, and error state
 */
export function useImageLoader(imageUrl, processImage = null) {
  const [imgData, setImgData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadAndProcessImage() {
      if (!imageUrl) {
        setError("No image URL provided");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const loadedImg = await loadImage(imageUrl);
        if (!isMounted) return;
        
        // Use custom processor if provided, otherwise default processing
        let processedData;
        if (processImage) {
          processedData = await processImage(loadedImg);
        } else {
          // Default: create ImageData from loaded image
          const canvas = document.createElement("canvas");
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Failed to get canvas context");
          }
          ctx.drawImage(loadedImg, 0, 0);
          processedData = ctx.getImageData(0, 0, loadedImg.width, loadedImg.height);
        }
        
        if (isMounted) {
          setImgData(processedData);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading image:", err);
        if (isMounted) {
          let errorMessage = "Failed to load image.";
          if (err instanceof Error) {
            if (err.message.includes("CORS")) {
              errorMessage = "CORS error: Image cannot be loaded due to cross-origin restrictions.";
            } else if (err.message.includes("404")) {
              errorMessage = "Image not found. Please check the image URL.";
            } else {
              errorMessage = `Error loading image: ${err.message}`;
            }
          }
          setError(errorMessage);
          setIsLoading(false);
          setImgData(null);
        }
      }
    }
    
    loadAndProcessImage();
    return () => {
      isMounted = false;
    };
  }, [imageUrl, processImage]);

  return { imgData, isLoading, error };
}

