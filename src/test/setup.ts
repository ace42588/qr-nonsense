import "@testing-library/jest-dom";
import { log, LogLevel } from "@/lib/logger";

log.setLevel(LogLevel.WARN);

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number, data?: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.data = data ?? new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = MockImageData as typeof ImageData;
}

if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: function getContext() {
      return {
        imageSmoothingEnabled: false,
        fillStyle: "white",
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        putImageData: () => {},
        getImageData: () => new ImageData(this.width || 0, this.height || 0),
      };
    },
  });
}
