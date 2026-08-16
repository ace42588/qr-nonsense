import { describe, it, expect } from "vitest";
import {
  encodeStructuredAppend,
  resolveStructuredAppendOptions,
  computeStructuredAppendParity,
} from "../structuredAppend";
import {
  encodeFnc1,
  encodeApplicationIndicator,
  resolveFnc1Options,
} from "../fnc1";
import { encodeInput, encodeAll } from "../index";
import { QREncodeError } from "../errors";

describe("Structured Append encoder", () => {
  it("encodes mode 0011 + sequence + parity", () => {
    const segments = encodeStructuredAppend("", {
      symbolIndex: 0,
      totalSymbols: 2,
      parity: 0x5a,
    });
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({
      type: "modeIndicator",
      value: 0x3,
      length: 4,
    });
    expect(segments[1]).toMatchObject({
      type: "structuredAppendSequence",
      value: 0x01, // index 0, total-1 = 1
      length: 8,
      text: "1/2",
    });
    expect(segments[2]).toMatchObject({
      type: "structuredAppendParity",
      value: 0x5a,
      length: 8,
    });
  });

  it("packs symbol index and total into the sequence byte", () => {
    const { symbolIndex, totalSymbols } = resolveStructuredAppendOptions({
      symbolIndex: 3,
      totalSymbols: 16,
      parity: 0,
    });
    expect(symbolIndex).toBe(3);
    expect(totalSymbols).toBe(16);
    const [ , sequence] = encodeStructuredAppend("", {
      symbolIndex: 3,
      totalSymbols: 16,
      parity: 0,
    });
    expect(sequence.value).toBe((3 << 4) | 15);
  });

  it("rejects invalid index / total / parity", () => {
    expect(() =>
      resolveStructuredAppendOptions({ symbolIndex: 16, totalSymbols: 16 })
    ).toThrow(QREncodeError);
    expect(() =>
      resolveStructuredAppendOptions({ symbolIndex: 1, totalSymbols: 1 })
    ).toThrow(QREncodeError);
    expect(() =>
      resolveStructuredAppendOptions({ parity: 256 })
    ).toThrow(QREncodeError);
  });

  it("computes parity as XOR of UTF-8 bytes", () => {
    expect(computeStructuredAppendParity(["A", "B"])).toBe(0x41 ^ 0x42);
  });

  it("is reachable via encodeInput", () => {
    const segments = encodeInput("structuredAppend", "", {
      symbolIndex: 0,
      totalSymbols: 1,
      parity: 0,
    });
    expect(segments[0].value).toBe(0x3);
  });
});

describe("FNC1 encoder", () => {
  it("encodes first-position header only when payload is empty", () => {
    const segments = encodeFnc1("", { position: "first" });
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      type: "modeIndicator",
      value: 0x5,
      length: 4,
    });
  });

  it("encodes first-position header plus alphanumeric payload", () => {
    const segments = encodeFnc1("01", { position: "first", payloadMode: "alphanumeric" });
    expect(segments[0]).toMatchObject({ type: "modeIndicator", value: 0x5 });
    expect(segments[1]).toMatchObject({
      type: "modeIndicator",
      value: 0x2,
    });
  });

  it("encodes second-position application indicator", () => {
    const segments = encodeFnc1("", {
      position: "second",
      applicationIndicator: "00",
    });
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      type: "modeIndicator",
      value: 0x9,
      length: 4,
    });
    expect(segments[1]).toMatchObject({
      type: "fnc1ApplicationIndicator",
      value: 0,
      length: 8,
    });
  });

  it("encodes letter application indicators as ASCII+100", () => {
    expect(encodeApplicationIndicator("A")).toBe(165);
    expect(encodeApplicationIndicator("z")).toBe(190);
  });

  it("resolves options and rejects missing second-position AI", () => {
    expect(resolveFnc1Options({ position: "first" }).position).toBe("first");
    expect(() => resolveFnc1Options({ position: "second" })).toThrow(
      QREncodeError
    );
  });

  it("is reachable via encodeInput aliases", () => {
    const first = encodeInput("fnc1First", "");
    expect(first[0].value).toBe(0x5);
    const second = encodeInput("fnc1Second", "", { applicationIndicator: 1 });
    expect(second[0].value).toBe(0x9);
    expect(second[1].value).toBe(1);
  });
});

describe("encodeAll with SA + FNC1 segments", () => {
  it("concatenates structured append then data", () => {
    const [segments, , error] = encodeAll(
      {
        a: {
          id: "a",
          mode: "structuredAppend",
          data: "",
          encoding: { symbolIndex: 0, totalSymbols: 2, parity: 0 },
        },
        b: { id: "b", mode: "numeric", data: "1", encoding: "" },
      },
      1
    );
    expect(error).toBeNull();
    expect(segments[0]).toMatchObject({ type: "modeIndicator", value: 0x3 });
    expect(segments.some((s) => s.type === "modeIndicator" && s.value === 0x1)).toBe(
      true
    );
  });
});
