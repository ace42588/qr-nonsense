import React, { useRef, useEffect, useState } from "react";
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

// Generate patterns
const patternsDark = generatePatterns(1);
const patternsLight = generatePatterns(0);

function patternReliability(pattern) {
  // Center pixel value
  const center = pattern[1][1];
  // Reinforcement: count how many adjacent subpixels match center
  let reinforcement = 0;
  for (let dy = -1; dy <= 1; ++dy) {
    for (let dx = -1; dx <= 1; ++dx) {
      if (dx === 0 && dy === 0) continue;
      if (pattern[1 + dy][1 + dx] === center) reinforcement++;
    }
  }
  // Transition penalty: count transitions (neighbor pairs)
  let transitions = 0;
  for (let y = 0; y < 3; ++y)
    for (let x = 0; x < 3; ++x) {
      if (x < 2 && pattern[y][x] !== pattern[y][x + 1]) transitions++;
      if (y < 2 && pattern[y][x] !== pattern[y + 1][x]) transitions++;
    }
  // Reliability heuristic: more reinforcement, fewer transitions
  return (reinforcement + 1) / (transitions + 1);
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

function choosePattern(patterns, brightness, importance, reliabilityWeight) {
  let best,
    bestScore = Infinity;
  for (let pat of patterns) {
    const blacks = pat.flat().reduce((a, b) => a + b, 0);
    const reliability = patternReliability(pat);
    const imageScore = Math.abs(blacks / 9 - (1 - brightness));
    // Lower score is better; importance modulates between image fit and reliability
    const score =
      importance * imageScore +
      (1 - importance) * (1 - reliability) * reliabilityWeight;
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
  modulePixel = 3, // grid is 3x3 per module
  reliabilityWeight = 0.4, // 0 = image fit only, 1 = reliability only
}) {
  const { matrix } = useQRData();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [scale, setScale] = useState(1);
  const [img, setImg] = useState(null);
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

      ctx.clearRect(0, 0, size, size);

    // Centered initial position, but allow for slider adjustment
    const drawX = size / 2 - (img.width * scale) / 2 + x;
    const drawY = size / 2 - (img.height * scale) / 2 + y;
      ctx.drawImage(img, drawX, drawY, img.width * scale, img.height * scale);
      const imgData = ctx.getImageData(0, 0, size, size);

      // Compute importance map
      const importanceMap = computeImportanceMap(imgData, size);

      // Generate patterns
      const patternsDark = generatePatterns(1);
      const patternsLight = generatePatterns(0);

      ctx.clearRect(0, 0, size, size);

      const moduleSize = size / qrSize;
      const subSize = moduleSize / modulePixel;

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
          const importance = importanceMap[py * size + px] || 0;

          const m = matrix[qy][qx];
          if (!m) continue;

          // Is this module dark or light?
          const { isDark, nonData } = m;
          const patterns = isDark ? patternsDark : patternsLight;
          const pattern = choosePattern(
            patterns,
            brightness,
            1,
            reliabilityWeight
          );

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

          // Draw 3x3 pattern for this module
          for (let sy = 0; sy < modulePixel; ++sy) {
            for (let sx = 0; sx < modulePixel; ++sx) {
              ctx.fillStyle = pattern[sy][sx] ? "#111" : "#fff";
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
  }, [matrix, x, y, scale, img, size]);

  return (
    <>
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
      <div style={{ marginTop: 16 }}>
        <label>
          X:{" "}
          <input
            type="range"
            min={-size / 2}
            max={size / 2}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            style={{ width: "80%" }}
          />{" "}
          {x}
        </label>
        <br />
        <label>
          Y:{" "}
          <input
            type="range"
            min={-size / 2}
            max={size / 2}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            style={{ width: "80%" }}
          />{" "}
          {y}
        </label>
        <br />
        <label>
          Scale:{" "}
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ width: "80%" }}
          />{" "}
          {scale.toFixed(2)}
        </label>
      </div>
    </>
  );
}
