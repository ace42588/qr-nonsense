import { describe, it, expect } from "vitest";
import { parseBasic } from "@/domain/input/parsers/parseBasic";
import { collectParseErrors, parseAll } from "@/domain/input";
import { createInput } from "@/state/inputs/inputFactory";

describe("parseBasic field unification", () => {
  it("reads canonical data when text is missing", () => {
    const parsed = parseBasic({
      mode: "byte",
      encoding: "utf-8",
      data: "from-data",
    });
    expect(parsed.data).toBe("from-data");
  });

  it("falls back to legacy text when data is missing", () => {
    const parsed = parseBasic({
      mode: "mixed",
      text: "Hello 123",
    });
    expect(parsed.data).toBe("Hello 123");
  });

  it("prefers data when both data and text are present", () => {
    const parsed = parseBasic({
      mode: "byte",
      encoding: "utf-8",
      data: "canonical",
      text: "legacy",
    });
    expect(parsed.data).toBe("canonical");
  });

  it("parses empty string instead of no-oping", () => {
    const parsed = parseBasic({
      mode: "byte",
      encoding: "utf-8",
      data: "",
    });
    expect(parsed.data).toBe("");
  });
});

describe("createInput text/data sync", () => {
  it("keeps text and data the same for string inputs", () => {
    const fromText = createInput({ type: "string", text: "hello" });
    expect(fromText.data).toBe("hello");
    expect(fromText.text).toBe("hello");

    const fromData = createInput({ type: "string", data: "world" });
    expect(fromData.data).toBe("world");
    expect(fromData.text).toBe("world");
  });
});

describe("parseAll errors", () => {
  it("surfaces input.error and skips encoding that input", () => {
    const bad = createInput({ type: "json", id: "json-1", label: "JSON" });
    bad.error = "Invalid JSON: Unexpected token";
    const parsed = parseAll([bad]);
    expect(parsed["json-1"].error).toBe("Invalid JSON: Unexpected token");
    expect(collectParseErrors(parsed)).toEqual({
      "json-1": "Invalid JSON: Unexpected token",
    });
  });

  it("catches parser exceptions as errors", () => {
    const parsed = parseAll([
      { id: "unknown-1", type: "not-a-type", data: "", mode: "nope" } as any,
    ]);
    expect(parsed["unknown-1"].error).toMatch(/Unknown input type/);
  });

  it("excludes qartVariation inputs from parse errors", () => {
    const variation = createInput({
      type: "string",
      id: "qart-append",
      label: "QArt append",
      qartVariation: true,
      data: "ABC",
    });
    const parsed = parseAll([variation]);
    expect(parsed["qart-append"].qartVariation).toBe(true);
    expect(collectParseErrors(parsed)).toEqual({});
  });
});
