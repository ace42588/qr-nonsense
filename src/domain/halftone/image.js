// Calculate perceived brightness from RGB values
export function getBrightness(r, g, b) {
  // Perceived brightness, 0=black, 255=white
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Compute importance map using edge detection (Sobel)
export function computeImportanceMap(imgData, size, alpha = 0.5) {
  const data = imgData.data;
  const importance = new Float32Array(size * size);
  const brightnessArr = new Float32Array(size * size);

  // Compute brightness for each pixel
  for (let y = 0; y < size; ++y) {
    for (let x = 0; x < size; ++x) {
      const i = (y * size + x) * 4;
      brightnessArr[y * size + x] = getBrightness(data[i], data[i + 1], data[i + 2]) / 255;
    }
  }

  // Compute edge strength (Sobel)
  for (let y = 1; y < size - 1; ++y) {
    for (let x = 1; x < size - 1; ++x) {
      const i = (y * size + x) * 4;
      const gx =
        getBrightness(data[i + 4], data[i + 5], data[i + 6]) -
        getBrightness(data[i - 4], data[i - 3], data[i - 2]);
      const gy =
        getBrightness(
          data[i + size * 4],
          data[i + size * 4 + 1],
          data[i + size * 4 + 2]
        ) -
        getBrightness(
          data[i - size * 4],
          data[i - size * 4 + 1],
          data[i - size * 4 + 2]
        );
      const edge = Math.sqrt(gx * gx + gy * gy) / 255;
      const brightness = brightnessArr[y * size + x];
      // Combine edge and brightness (midtones are more important)
      importance[y * size + x] = alpha * edge + (1 - alpha) * (1 - Math.abs(brightness - 0.5) * 2);
    }
  }

  // Normalize importance map to 0-1
  let maxImp = Math.max(...importance);
  if (maxImp > 0) {
    for (let i = 0; i < importance.length; ++i) importance[i] /= maxImp;
  }

  return importance;
}

// Load and process an image
export async function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

// Draw image on canvas with optional scaling and positioning
export function drawImage(ctx, img, x, y, scale = 1) {
  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

// Get image data from canvas
export function getImageData(ctx, width, height) {
  return ctx.getImageData(0, 0, width, height);
} 