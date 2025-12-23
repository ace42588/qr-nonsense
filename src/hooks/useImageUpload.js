import { useCallback, useRef } from "react";

/**
 * Shared hook for handling image file uploads
 * Returns file input ref and upload handler
 */
export function useImageUpload(onImageUrlChange) {
  const fileInputRef = useRef(null);

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
        onImageUrlChange(result);
      }
    };
    reader.onerror = () => {
      console.error('Error reading image file');
    };
    reader.readAsDataURL(file);
  }, [onImageUrlChange]);

  return { fileInputRef, handleImageUpload };
}

