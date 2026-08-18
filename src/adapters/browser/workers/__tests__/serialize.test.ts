import { describe, it, expect } from "vitest";
import { hydrateContext, serializeContext } from "../serialize";

function pixels(width: number, height: number, fill = 42): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(fill);
  return { data, width, height } as ImageData;
}

describe("pipeline context image serialize", () => {
  it("round-trips fusedImage width/height/pixels", () => {
    const fused = pixels(3, 3, 17);
    fused.data[0] = 9;
    const hydrated = hydrateContext(
      serializeContext({
        fusedImage: fused,
        targetImage: pixels(2, 2, 1),
      })
    );
    expect(hydrated.fusedImage?.width).toBe(3);
    expect(hydrated.fusedImage?.height).toBe(3);
    expect(hydrated.fusedImage?.data[0]).toBe(9);
    expect(hydrated.targetImage?.width).toBe(2);
  });

  it("rehydrates ImageData whose pixels arrived as Uint8Array", () => {
    const data = new Uint8Array(8);
    data[0] = 200;
    const hydrated = hydrateContext({
      fusedImage: { data, width: 2, height: 1 },
    });
    expect(hydrated.fusedImage?.width).toBe(2);
    expect(hydrated.fusedImage?.data).toBeInstanceOf(Uint8ClampedArray);
    expect(hydrated.fusedImage?.data[0]).toBe(200);
  });
});
