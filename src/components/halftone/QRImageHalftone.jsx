import React, { useRef, useEffect } from "react";
//import QRCode from "qrcode";
import { useQRData } from "../../state";

// Generate all possible 3x3 patterns with given center value
function generatePatterns(center) {
  const patterns = [];
  for (let mask = 0; mask < 256; ++mask) {
    const pat = [
      [(mask >> 7) & 1, (mask >> 6) & 1, (mask >> 5) & 1],
      [(mask >> 0) & 1, center, (mask >> 4) & 1],
      [(mask >> 1) & 1, (mask >> 2) & 1, (mask >> 3) & 1],
    ];
    patterns.push(pat);
  }
  return patterns;
}

// Dummy reliability: e.g., patterns with more black pixels are more "reliable"
function getDummyReliability(pattern) {
  // You could use something more clever, but this works for demo
  let blacks = pattern.flat().reduce((a, b) => a + b, 0);
  return blacks / 9; // 0 to 1
}

function getBrightness(r, g, b) {
  // Perceived brightness, 0=black, 255=white
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Some candidate patterns (black=1, white=0) for center black or white
// For dark (center=1) and light (center=0) modules
const PATTERNS = {
  dark: [
    [
      // only center black
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
    [
      // cross
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      // center + edges
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ],
    [
      // all black
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  ],
  light: [
    [
      // only center white
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    [
      // cross
      [1, 0, 1],
      [0, 0, 0],
      [1, 0, 1],
    ],
    [
      // edges white
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ],
    [
      // all white
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  ],
};

// Simple importance map using edge detection (Sobel)
function computeImportanceMap(imgData, size) {
  // For brevity, a very basic "edge" detector
  const data = imgData.data;
  const importance = new Float32Array(size * size);
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
      importance[y * size + x] = Math.sqrt(gx * gx + gy * gy) / 255;
    }
  }
  // Normalize importance map to 0-1
  let maxImp = Math.max(...importance);
  if (maxImp > 0) {
    for (let i = 0; i < importance.length; ++i) importance[i] /= maxImp;
  }
  return importance;
}

// Choose pattern by which has number of black subpixels closest to (1-brightness) * 9
function choosePattern(patterns, brightness) {
  let best = patterns[0],
    bestScore = 999;
  for (let pat of patterns) {
    // count black subpixels
    let blacks = pat.flat().reduce((a, b) => a + b, 0);
    // center is always correct
    let targetBlacks = (1 - brightness) * 9;
    let score = Math.abs(blacks - targetBlacks);
    if (score < bestScore) {
      best = pat;
      bestScore = score;
    }
  }
  return best;
}

export default function QRImageHalftone({
  text = "https://defcon.org/images/defcon-33/dc33-logo.webp",
  imageUrl = "https://cdn.glitch.global/18921864-7cab-44f6-a895-dad8926b3c21/defcon_k_skull-reg_cropped.jpg?v=1745787807417",
  size = 480,
  subDivs = 3,
}) {
  const { matrix } = useQRData();
  const canvasRef = useRef();

  useEffect(() => {
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = async () => {
      if (!canvasRef.current || !matrix) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const qrSize = matrix.length;

      // Draw and sample image
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);

      // Compute importance map
      const importanceMap = computeImportanceMap(imgData, size);

      // Generate patterns
      const patternsDark = generatePatterns(1);
      const patternsLight = generatePatterns(0);
      const reliabilitiesDark = patternsDark.map(getDummyReliability);
      const reliabilitiesLight = patternsLight.map(getDummyReliability);

      ctx.clearRect(0, 0, size, size);

      const moduleSize = size / qrSize;
      const subSize = moduleSize / subDivs;

      // For each QR module
      for (let qy = 0; qy < qrSize; ++qy) {
        for (let qx = 0; qx < qrSize; ++qx) {
          // Center of QR module
          const centerX = (qx + 0.5) * moduleSize;
          const centerY = (qy + 0.5) * moduleSize;
          const px = Math.floor(centerX);
          const py = Math.floor(centerY);
          const idx = (py * size + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const brightness = getBrightness(r, g, b) / 255; // 0 (black) .. 1 (white)

          const m = matrix[qy][qx];

          // Is this module dark or light?
          const { isDark, nonData } = m;

          if (nonData) {
            ctx.fillStyle = m.isDark ? "black" : "white";
            ctx.fillRect(
              qx * moduleSize,
              qy * moduleSize,
              moduleSize,
              moduleSize
            );
            continue;
          }

          // Select best matching pattern
          const patterns = isDark ? PATTERNS.dark : PATTERNS.light;
          const pattern = choosePattern(patterns, brightness);

          // Draw 3x3 pattern for this module
          for (let sy = 0; sy < subDivs; ++sy) {
            for (let sx = 0; sx < subDivs; ++sx) {
              const color = pattern[sy][sx] ? "#111" : "#fff";
              ctx.fillStyle = color;
              ctx.fillRect(
                qx * moduleSize + sx * subSize,
                qy * moduleSize + sy * subSize,
                subSize,
                subSize
              );
            }
          }

          if (m.isHighlighted) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              qx * moduleSize,
              qy * moduleSize,
              moduleSize,
              moduleSize
            );
          }
        }
      }
    };
    return () => {
      isMounted = false;
    };
  }, [matrix]);

  return (
    <canvas
      id="halftone"
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        boxShadow: "0 2px 10px #0002",
        display: "block",
      }}
    />
  );
}
