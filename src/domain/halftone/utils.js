const domTarget = document.currentScript.parentElement;
const attach = (node) => {
  document.currentScript.parentElement.appendChild(node);
};
const resize = (canvas, width, height) => {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
};

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  resize(canvas, width, height);
  return canvas;
};

const WIDTH = 200,
  HEIGHT = 200;

const sourceCanvas = createCanvas(WIDTH, HEIGHT);
attach(sourceCanvas);
const sourceCtx = sourceCanvas.getContext("2d");

const gradient = sourceCtx.createLinearGradient(
  0,
  HEIGHT / 2,
  WIDTH,
  HEIGHT / 2
);
gradient.addColorStop(0, "black");
gradient.addColorStop(1, "white");

sourceCtx.fillStyle = gradient;
sourceCtx.fillRect(0, 0, WIDTH, HEIGHT);

const targetCanvas = createCanvas(WIDTH, HEIGHT);
attach(targetCanvas);
const targetCtx = targetCanvas.getContext("2d");

let PIXELS_PER_DOT = 10;
const sourceImageData = sourceCtx.getImageData(0, 0, WIDTH, HEIGHT);

const positionToDataIndex = (x, y, width) => {
  width = width || WIDTH;
  // data is arranged as [R, G, B, A, R, G, B, A, ...]
  return (y * width + x) * 4;
};

// re-maps a value from its original range [minA, maxA] to the range [minB, maxB]
const map = (value, minA, maxA, minB, maxB) => {
  return ((value - minA) / (maxA - minA)) * (maxB - minB) + minB;
};

const rotationCanvas = createCanvas(WIDTH, HEIGHT);
attach(rotationCanvas);
const rotationCtx = rotationCanvas.getContext("2d");

const rotatePointAboutPosition = ([x, y], [rotX, rotY], angle) => {
  return [
    (x - rotX) * Math.cos(angle) - (y - rotY) * Math.sin(angle) + rotX,
    (x - rotX) * Math.sin(angle) + (y - rotY) * Math.cos(angle) + rotY,
  ];
};

const halftone = ({
  angle,
  dotSize,
  dotResolution,
  targetCtx,
  sourceCtx,
  width,
  height,
  color,
  layer,
}) => {
  const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
  angle = (angle * Math.PI) / 180;
  targetCtx.fillStyle = "white";
  layer || targetCtx.fillRect(0, 0, width, height);
  targetCtx.fillStyle = color || "black";
  // get the four corners of the screen
  const tl = [0, 0];
  const tr = [width, 0];
  const br = [width, height];
  const bl = [0, height];
  // rotate the screen, then find the minimum and maximum of the values.
  const boundaries = [tl, br, tr, bl].map(([x, y]) => {
    return rotatePointAboutPosition([x, y], [width / 2, height / 2], angle);
  });
  const minX = Math.min(...boundaries.map((point) => point[0])) | 0;
  const minY = Math.min(...boundaries.map((point) => point[1])) | 0;
  const maxY = Math.max(...boundaries.map((point) => point[1])) | 0;
  const maxX = Math.max(...boundaries.map((point) => point[0])) | 0;

  for (let y = minY; y < maxY; y += dotResolution) {
    for (let x = minX; x < maxX; x += dotResolution) {
      let [rotatedX, rotatedY] = rotatePointAboutPosition(
        [x, y],
        [width / 2, height / 2],
        -angle
      );

      if (
        rotatedX < 0 ||
        rotatedY < 0 ||
        rotatedX > width ||
        rotatedY > height
      ) {
        continue;
      }
      const index = positionToDataIndex(
        Math.floor(rotatedX),
        Math.floor(rotatedY),
        width
      );
      // we're always operating on grayscale images, so just grab the value from
      // the red channel.
      const value = sourceImageData.data[index];
      const alpha = sourceImageData.data[index + 3];
      if (alpha) {
        const circleRadius = map(value, 0, 255, dotSize / 2, 0);
        targetCtx.beginPath();
        targetCtx.arc(rotatedX, rotatedY, circleRadius, 0, Math.PI * 2);
        targetCtx.closePath();
        targetCtx.fill();
      }
    }
  }
};
