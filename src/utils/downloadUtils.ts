/**
 * Utility functions for downloading QR codes as PNG or SVG files
 */

/**
 * Generates a timestamped filename with the given prefix and extension
 * Format: prefix-YYYY-MM-DD-HHMMSS.extension
 * Example: qr-code-2024-01-15-143022.png
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Downloads a canvas element as a PNG image file
 */
export function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename?: string): void {
  if (!canvas) {
    throw new Error('Canvas element is required');
  }

  const finalFilename = filename || generateFilename('qr-code', 'png');
  
  // Convert canvas to data URL
  const dataURL = canvas.toDataURL('image/png');
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a QR code matrix as an SVG file
 * @param matrix - The QR code matrix (2D array of modules with isDark property)
 * @param size - The size of the QR code in pixels (excluding quiet zone)
 * @param quietZone - The quiet zone size in modules (default: 4)
 * @param filename - Optional filename (will be generated if not provided)
 */
export function downloadQRAsSVG(
  matrix: Array<Array<{ isDark?: boolean }>> | null,
  size: number,
  quietZone: number = 4,
  filename?: string
): void {
  if (!matrix || matrix.length === 0) {
    throw new Error('Matrix is required and must not be empty');
  }

  const finalFilename = filename || generateFilename('qr-code', 'svg');
  const dimension = matrix.length;
  const totalDimension = dimension + quietZone * 2;
  const moduleSize = size / totalDimension;
  
  // Calculate SVG dimensions (including quiet zone)
  const svgSize = size;
  
  // Build SVG string
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">\n`;
  
  // Add white background (quiet zone + QR code area)
  svgContent += `  <rect width="${svgSize}" height="${svgSize}" fill="white"/>\n`;
  
  // Add black modules
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const module = matrix[y]?.[x];
      if (module && module.isDark) {
        const moduleX = (x + quietZone) * moduleSize;
        const moduleY = (y + quietZone) * moduleSize;
        svgContent += `  <rect x="${moduleX}" y="${moduleY}" width="${moduleSize}" height="${moduleSize}" fill="black"/>\n`;
      }
    }
  }
  
  svgContent += '</svg>';
  
  // Create blob and trigger download
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}

