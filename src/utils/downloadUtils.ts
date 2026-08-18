/**
 * Utility functions for downloading QR codes as PNG, SVG, and STL files
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
 * Downloads composited canvas frames as an animated GIF.
 */
export async function downloadCanvasFramesAsGif(
  frames: ImageData[],
  delaysMs: number[],
  filename?: string
): Promise<void> {
  if (!frames.length) {
    throw new Error("No frames to encode");
  }
  const { encodeGif } = await import("@/adapters/browser/gif");
  const bytes = encodeGif(frames, delaysMs);
  const blob = new Blob([bytes], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || generateFilename("qr-code", "gif");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
 * Downloads a canvas element as an SVG file with embedded image
 * This preserves the rendered appearance including QArt, halftone patterns, etc.
 * @param canvas - The canvas element containing the rendered QR code
 * @param filename - Optional filename (will be generated if not provided)
 */
export function downloadCanvasAsSVG(canvas: HTMLCanvasElement, filename?: string): void {
  if (!canvas) {
    throw new Error('Canvas element is required');
  }

  const finalFilename = filename || generateFilename('qr-code', 'svg');
  const width = canvas.width;
  const height = canvas.height;
  
  // Convert canvas to data URL (PNG format)
  const dataURL = canvas.toDataURL('image/png');
  
  // Build SVG string with embedded image
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataURL}"/>
</svg>`;
  
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

/**
 * Downloads a QR code matrix as an SVG file (basic vector representation)
 * Note: This only shows basic dark/light modules, not custom rendering.
 * For rendered QR codes (QArt, halftone), use downloadCanvasAsSVG instead.
 * @param matrix - The QR code matrix (2D array of modules with isDark property)
 * @param size - The size of the QR code in pixels (excluding quiet zone)
 * @param quietZone - The quiet zone size in modules (default: 4)
 * @param filename - Optional filename (will be generated if not provided)
 * @deprecated Use downloadCanvasAsSVG for rendered QR codes
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

/**
 * Creates triangles for a box (rectangular prism) for STL format
 * @param x - X position (center)
 * @param y - Y position (center)  
 * @param z - Z position (bottom)
 * @param width - Width in X direction
 * @param height - Height in Y direction
 * @param depth - Depth in Z direction
 * @returns Array of triangle definitions, each with 3 vertices (9 numbers: x,y,z for each vertex)
 */
function createBoxTriangles(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number
): Array<[number[], number[], number[]]> {
  const w = width / 2;
  const h = height / 2;
  const d = depth;
  
  // Define the 8 vertices of the box
  const v = {
    blf: [x - w, y - h, z],        // bottom-left-front
    brf: [x + w, y - h, z],        // bottom-right-front
    trf: [x + w, y + h, z],        // top-right-front
    tlf: [x - w, y + h, z],        // top-left-front
    blb: [x - w, y - h, z + d],    // bottom-left-back
    brb: [x + w, y - h, z + d],    // bottom-right-back
    trb: [x + w, y + h, z + d],    // top-right-back
    tlb: [x - w, y + h, z + d],    // top-left-back
  };
  
  // Each face has 2 triangles, 6 faces = 12 triangles
  return [
    // Front face (z = z)
    [v.blf, v.brf, v.trf],
    [v.blf, v.trf, v.tlf],
    // Back face (z = z + d)
    [v.brb, v.blb, v.tlb],
    [v.brb, v.tlb, v.trb],
    // Right face (x = x + w)
    [v.brf, v.brb, v.trb],
    [v.brf, v.trb, v.trf],
    // Left face (x = x - w)
    [v.blb, v.blf, v.tlf],
    [v.blb, v.tlf, v.tlb],
    // Top face (y = y + h)
    [v.tlf, v.trf, v.trb],
    [v.tlf, v.trb, v.tlb],
    // Bottom face (y = y - h)
    [v.blb, v.brb, v.brf],
    [v.blb, v.brf, v.blf],
  ];
}

/**
 * Calculates normal vector for a triangle (for STL format)
 */
function calculateNormal(v1: number[], v2: number[], v3: number[]): number[] {
  const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
  
  const nx = u[1] * v[2] - u[2] * v[1];
  const ny = u[2] * v[0] - u[0] * v[2];
  const nz = u[0] * v[1] - u[1] * v[0];
  
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return length > 0 ? [nx / length, ny / length, nz / length] : [0, 0, 1];
}

/**
 * Converts triangles to STL ASCII format
 */
function trianglesToSTL(triangles: Array<[number[], number[], number[]]>): string {
  let stl = 'solid QRCode\n';
  
  for (const triangle of triangles) {
    const [v1, v2, v3] = triangle;
    const normal = calculateNormal(v1, v2, v3);
    
    stl += `  facet normal ${normal[0].toFixed(6)} ${normal[1].toFixed(6)} ${normal[2].toFixed(6)}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)}\n`;
    stl += `      vertex ${v2[0].toFixed(6)} ${v2[1].toFixed(6)} ${v2[2].toFixed(6)}\n`;
    stl += `      vertex ${v3[0].toFixed(6)} ${v3[1].toFixed(6)} ${v3[2].toFixed(6)}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  }
  
  stl += 'endsolid QRCode\n';
  return stl;
}/**
 * Downloads a QR code as an STL file for 3D printing
 * @param matrix - The QR code matrix (2D array of modules with isDark property)
 * @param size - The size of the QR code in pixels (excluding quiet zone)
 * @param quietZone - The quiet zone size in modules (default: 4)
 * @param mode - 'single' for single-color (light modules taller) or 'multicolor' (separate STLs)
 * @param baseHeight - Base height for dark modules in single-color mode (default: 1.0)
 * @param lightHeight - Height for light modules in single-color mode (default: 2.0)
 * @param moduleHeight - Height for modules in multicolor mode (default: 1.5)
 * @param scale - Scale factor for STL units (default: 0.1, meaning 1 unit = 0.1mm, so 10 units = 1mm)
 * @param includeQuietZone - Whether to include a base platform for the quiet zone (default: false)
 * @param quietZoneHeight - Height of the quiet zone base platform (default: 0.5)
 */
export function downloadQRAsSTL(
  matrix: Array<Array<{ isDark?: boolean }>> | null,
  size: number,
  quietZone: number = 4,
  mode: 'single' | 'multicolor' = 'single',
  baseHeight: number = 1.0,
  lightHeight: number = 2.0,
  moduleHeight: number = 1.5,
  scale: number = 0.1,
  includeQuietZone: boolean = false,
  quietZoneHeight: number = 0.5
): void {
  if (!matrix || matrix.length === 0) {
    throw new Error('Matrix is required and must not be empty');
  }

  const dimension = matrix.length;
  const totalDimension = dimension + quietZone * 2;
  const modulePixelSize = size / totalDimension;
  
  // Convert pixel size to STL units
  const moduleSize = modulePixelSize * scale;
  
  // Calculate total size including quiet zone (size already includes quiet zone in pixel calculations)
  // The size parameter represents the canvas size which includes quiet zone
  const totalSize = size * scale;
  
  // Center the QR code at origin (0, 0, 0)
  const offsetX = -(size * scale) / 2;
  const offsetY = -(size * scale) / 2;

  // Helper function to add quiet zone base platform
  const addQuietZoneBase = (triangles: Array<[number[], number[], number[]]>) => {
    if (!includeQuietZone) return;
    
    // Create a flat base platform covering the entire QR code area including quiet zone
    // The base sits below z=0, so modules can sit on top of it
    const baseZ = -quietZoneHeight;
    
    // Create a flat rectangular base covering the entire QR code area (including quiet zone)
    // The base extends from -quietZoneHeight to 0, centered at origin
    const baseTriangles = createBoxTriangles(
      0, // centered at origin
      0, // centered at origin
      baseZ,
      totalSize,
      totalSize,
      quietZoneHeight
    );
    
    triangles.push(...baseTriangles);
  };

  if (mode === 'single') {
    // Single-color mode: light modules are taller than dark modules
    const triangles: Array<[number[], number[], number[]]> = [];
    
    // Add quiet zone base if requested
    addQuietZoneBase(triangles);
    
    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const module = matrix[y]?.[x];
        if (!module) continue;
        
        const isLight = !module.isDark;
        const moduleX = offsetX + (x + quietZone) * modulePixelSize * scale + moduleSize / 2;
        const moduleY = offsetY + (y + quietZone) * modulePixelSize * scale + moduleSize / 2;
        const z = includeQuietZone ? 0 : 0; // Modules sit on top of base if quiet zone is included
        const depth = isLight ? lightHeight : baseHeight;
        
        const boxTriangles = createBoxTriangles(
          moduleX,
          moduleY,
          z,
          moduleSize,
          moduleSize,
          depth
        );
        triangles.push(...boxTriangles);
      }
    }
    
    const stlContent = trianglesToSTL(triangles);
    const filename = generateFilename('qr-code', 'stl');
    
    const blob = new Blob([stlContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } else {
    // Multicolor mode: separate STLs for light and dark modules (same height)
    const lightTriangles: Array<[number[], number[], number[]]> = [];
    const darkTriangles: Array<[number[], number[], number[]]> = [];
    
    // Add quiet zone base to both if requested
    if (includeQuietZone) {
      addQuietZoneBase(lightTriangles);
      addQuietZoneBase(darkTriangles);
    }
    
    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const module = matrix[y]?.[x];
        if (!module) continue;
        
        const isLight = !module.isDark;
        const moduleX = offsetX + (x + quietZone) * modulePixelSize * scale + moduleSize / 2;
        const moduleY = offsetY + (y + quietZone) * modulePixelSize * scale + moduleSize / 2;
        const z = includeQuietZone ? 0 : 0; // Modules sit on top of base if quiet zone is included
        
        const boxTriangles = createBoxTriangles(
          moduleX,
          moduleY,
          z,
          moduleSize,
          moduleSize,
          moduleHeight
        );
        
        if (isLight) {
          lightTriangles.push(...boxTriangles);
        } else {
          darkTriangles.push(...boxTriangles);
        }
      }
    }
    
    // Download light modules STL
    if (lightTriangles.length > 0) {
      const lightSTL = trianglesToSTL(lightTriangles);
      const lightFilename = generateFilename('qr-code-light', 'stl');
      
      const blob = new Blob([lightSTL], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = lightFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
    
    // Download dark modules STL (with small delay to ensure first download completes)
    if (darkTriangles.length > 0) {
      setTimeout(() => {
        const darkSTL = trianglesToSTL(darkTriangles);
        const darkFilename = generateFilename('qr-code-dark', 'stl');
        
        const blob = new Blob([darkSTL], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = darkFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
      }, 100);
    }
  }
}
