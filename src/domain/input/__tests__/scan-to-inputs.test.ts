import { describe, expect, it } from "vitest";
import { inputsFromScan, encodingFromEci } from "../scanToInputs";

describe("encodingFromEci", () => {
  it("maps common assignment numbers", () => {
    expect(encodingFromEci(26)).toBe("utf-8");
    expect(encodingFromEci(3)).toBe("ISO-8859-1");
  });

  it("falls back to the assignment number string", () => {
    expect(encodingFromEci(99)).toBe("99");
  });
});

describe("inputsFromScan", () => {
  it("builds string inputs from data chunks", () => {
    const inputs = inputsFromScan({
      data: "HELLO123",
      chunks: [
        { type: "alphanumeric", text: "HELLO" },
        { type: "numeric", text: "123" },
      ],
      formatInfo: { errorCorrectionLevel: 0, dataMask: 1 },
      version: 2,
    });

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({
      type: "string",
      data: "HELLO",
      text: "HELLO",
      mode: "alphanumeric",
    });
    expect(inputs[1]).toMatchObject({
      type: "string",
      data: "123",
      mode: "numeric",
    });
    expect(inputs[0].id).toBeTruthy();
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });

  it("applies ECI encoding to the following byte segment", () => {
    const inputs = inputsFromScan({
      data: "café",
      chunks: [
        { type: "eci", assignmentNumber: 26 },
        { type: "byte", text: "café", bytes: [99, 97, 102, 195, 169] },
      ],
    });

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      data: "café",
      mode: "byte",
      encoding: "utf-8",
    });
  });

  it("falls back to code.data when chunks are empty", () => {
    const inputs = inputsFromScan({ data: "fallback", chunks: [] });
    expect(inputs).toHaveLength(1);
    expect(inputs[0].data).toBe("fallback");
    expect(inputs[0].type).toBe("string");
  });

  it("returns an empty list when there is nothing usable", () => {
    expect(inputsFromScan({ data: "", chunks: [] })).toEqual([]);
    expect(inputsFromScan(null)).toEqual([]);
  });
});
