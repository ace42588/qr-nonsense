import { describe, it, expect } from "vitest";
import { parseStructuredAppend } from "../parsers/parseStructuredAppend";
import { parseFnc1 } from "../parsers/parseFnc1";
import { parseAll } from "../index";

describe("parseStructuredAppend", () => {
  it("packs header fields into encoding options", () => {
    const parsed = parseStructuredAppend({
      type: "structuredAppend",
      symbolIndex: 1,
      totalSymbols: 3,
      parity: 42,
    });
    expect(parsed.error).toBeUndefined();
    expect(parsed.mode).toBe("structuredAppend");
    expect(parsed.encoding).toEqual({
      symbolIndex: 1,
      totalSymbols: 3,
      parity: 42,
    });
  });

  it("rejects index >= total", () => {
    const parsed = parseStructuredAppend({
      type: "structuredAppend",
      symbolIndex: 2,
      totalSymbols: 2,
      parity: 0,
    });
    expect(parsed.error).toMatch(/less than total/);
  });
});

describe("parseFnc1", () => {
  it("defaults to GS1 first position + alphanumeric", () => {
    const parsed = parseFnc1({
      type: "fnc1",
      text: "0101234567890128",
      fnc1Position: "first",
      payloadMode: "alphanumeric",
    });
    expect(parsed.error).toBeUndefined();
    expect(parsed.mode).toBe("fnc1");
    expect(parsed.data).toBe("0101234567890128");
    expect(parsed.encoding).toMatchObject({
      position: "first",
      payloadMode: "alphanumeric",
    });
  });

  it("uppercases alphanumeric and allows % as GS", () => {
    const parsed = parseFnc1({
      type: "fnc1",
      text: "10abc%21xy",
      fnc1Position: "first",
      payloadMode: "alphanumeric",
    });
    expect(parsed.error).toBeUndefined();
    expect(parsed.data).toBe("10ABC%21XY");
  });

  it("requires application indicator for second position", () => {
    const parsed = parseFnc1({
      type: "fnc1",
      text: "HELLO",
      fnc1Position: "second",
      applicationIndicator: "",
      payloadMode: "alphanumeric",
    });
    expect(parsed.error).toMatch(/application indicator/);
  });
});

describe("parseAll registration", () => {
  it("parses structuredAppend and fnc1 inputs", () => {
    const parsed = parseAll([
      {
        id: "sa",
        type: "structuredAppend",
        symbolIndex: 0,
        totalSymbols: 2,
        parity: 0,
        data: "",
        mode: "structuredAppend",
      },
      {
        id: "gs1",
        type: "fnc1",
        text: "01",
        data: "01",
        mode: "fnc1",
        fnc1Position: "first",
        payloadMode: "alphanumeric",
      },
    ]);
    expect(parsed.sa.mode).toBe("structuredAppend");
    expect(parsed.gs1.mode).toBe("fnc1");
    expect(parsed.gs1.data).toBe("01");
  });
});
