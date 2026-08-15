import { describe, it, expect } from "vitest";
import { parseJson } from "@/domain/input/parsers/parseJson";
import { bitSchema, jsonSchema } from "@/domain/input/serializationSchemas";
import { ENCODING_STRATEGIES, resolveEncodingStrategy } from "@/domain/encoders";

const sampleObj = {
  p: 1,
  cc: 10,
  txn: 3,
  i: [{ v: 1, q: 2 }],
};

describe("JSON encoding strategies", () => {
  it("exposes parser keys as encoding strategies", () => {
    expect(ENCODING_STRATEGIES).toEqual([
      "None",
      "Alphanumeric",
      "PER",
      "PER-ModHex",
      "PER-NTRU",
    ]);
  });

  it("resolves legacy ModHex/NTRU labels to parser keys", () => {
    expect(resolveEncodingStrategy("ModHex")).toBe("PER-ModHex");
    expect(resolveEncodingStrategy("NTRU")).toBe("PER-NTRU");
    expect(resolveEncodingStrategy("PER-ModHex")).toBe("PER-ModHex");
  });

  it("uses the PER-ModHex parser when that encoding is selected", () => {
    const result = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "PER-ModHex",
    });
    expect(result.mode).toBe("alphanumeric");
    expect(result.encoding).toBe("modhex");
    expect(typeof result.data).toBe("string");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("maps legacy ModHex UI value to the PER-ModHex parser", () => {
    const keyed = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "PER-ModHex",
    });
    const aliased = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "ModHex",
    });
    expect(aliased.encoding).toBe("modhex");
    expect(aliased.data).toBe(keyed.data);
  });

  it("uses the PER-NTRU parser when that encoding is selected", () => {
    const result = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "PER-NTRU",
    });
    expect(result.mode).toBe("numeric");
    expect(result.encoding).toBe("ntru");
    expect(typeof result.data).toBe("string");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("maps legacy NTRU UI value to the PER-NTRU parser", () => {
    const keyed = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "PER-NTRU",
    });
    const aliased = parseJson({
      obj: sampleObj,
      schema: bitSchema,
      encoding: "NTRU",
    });
    expect(aliased.encoding).toBe("ntru");
    expect(aliased.data).toBe(keyed.data);
  });

  it("stringifies JSON when encoding is None", () => {
    const result = parseJson({
      obj: sampleObj,
      schema: jsonSchema,
      encoding: "None",
    });
    expect(result.data).toBe(JSON.stringify(sampleObj));
    expect(result.mode).toBe("byte");
  });
});
