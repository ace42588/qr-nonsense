import { describe, it, expect } from "vitest";
import { encodeByte } from "../byte";
import { encodeInput } from "../index";
import { encodeMixed } from "../mixed";
import {
  classifyInput,
  encodeOptimized,
  optimizeInput,
  OPTIMIZED_MODE,
} from "../optimize";
import { getNumBits } from "../utils";
import { updateCharCountIndicatorLengths } from "../../charCount";
import { parseBasic } from "@/domain/input/parsers/parseBasic";

function payloadBits(
  segments: { type?: string; length: number }[],
  version = 1
): number {
  const updated = updateCharCountIndicatorLengths(segments as any, version);
  return getNumBits(
    updated.filter(
      (s) => s.type !== "terminator" && s.type !== "fill" && s.type !== "padding"
    )
  );
}

describe("optimized input classification", () => {
  it("detects URLs, email, phone, wifi, and plain text", () => {
    expect(classifyInput("https://example.com/x?q=1")).toBe("url");
    expect(classifyInput("www.example.com/x")).toBe("url");
    expect(classifyInput("example.com/path")).toBe("url");
    expect(classifyInput("user@example.com")).toBe("email");
    expect(classifyInput("mailto:user@example.com")).toBe("email");
    expect(classifyInput("tel:+1-555-0100")).toBe("phone");
    expect(classifyInput("sms:+1555?body=Hi")).toBe("sms");
    expect(classifyInput("WIFI:S:Net;T:WPA;P:secret;;")).toBe("wifi");
    expect(classifyInput("Hello world")).toBe("plain");
  });

  it("does not treat a URL with userinfo as an email", () => {
    expect(classifyInput("https://user@example.com/path")).toBe("url");
  });
});

describe("optimized transforms", () => {
  it("uppercases URL protocol, subdomain, domain, and TLD, leaving path and query as-is", () => {
    const result = optimizeInput(
      "https://www.example.com/path/to/Page?foo=Bar&x=1#hash"
    );
    expect(result.category).toBe("url");
    expect(result.text).toBe(
      "HTTPS://WWW.EXAMPLE.COM/path/to/Page?foo=Bar&x=1#hash"
    );
    expect(result.transformed).toBe(true);
  });

  it("uppercases a host with port and preserves userinfo", () => {
    const result = optimizeInput("https://Alice:Secret@sub.example.co.uk:8080/p?q=1");
    expect(result.text).toBe(
      "HTTPS://Alice:Secret@SUB.EXAMPLE.CO.UK:8080/p?q=1"
    );
  });

  it("uppercases IPv6 host hex without touching the path", () => {
    expect(optimizeInput("http://[fe80::1]/status").text).toBe(
      "HTTP://[FE80::1]/status"
    );
  });

  it("uppercases email domains and mailto schemes, keeping the local part", () => {
    expect(optimizeInput("User@Example.COM").text).toBe("User@EXAMPLE.COM");
    expect(optimizeInput("mailto:User@Example.COM").text).toBe(
      "MAILTO:User@EXAMPLE.COM"
    );
  });

  it("uppercases tel/sms/geo schemes", () => {
    expect(optimizeInput("tel:+1-555-0100").text).toBe("TEL:+1-555-0100");
    expect(optimizeInput("sms:+1555?body=Hello").text).toBe(
      "SMS:+1555?body=Hello"
    );
    expect(optimizeInput("geo:37.77,-122.42").text).toBe("GEO:37.77,-122.42");
  });

  it("uppercases Wi-Fi and MECARD keys without changing values that contain colons", () => {
    expect(optimizeInput("wifi:s:Net;t:wpa;p:ab:cd;;").text).toBe(
      "WIFI:S:Net;T:wpa;P:ab:cd;;"
    );
    expect(optimizeInput("mecard:n:Smith,John;tel:123;").text).toBe(
      "MECARD:N:Smith,John;TEL:123;"
    );
  });

  it("uppercases vCard property names, not values", () => {
    const result = optimizeInput("begin:vcard\nfn:Jane Doe\nend:vcard");
    expect(result.category).toBe("vcard");
    expect(result.text).toBe("BEGIN:VCARD\nFN:Jane Doe\nEND:VCARD");
  });

  it("leaves plain text unchanged", () => {
    const result = optimizeInput("Hello world 123");
    expect(result.category).toBe("plain");
    expect(result.text).toBe("Hello world 123");
    expect(result.transformed).toBe(false);
  });
});

describe("optimized encoding", () => {
  it("is shorter than mixed encoding for a typical URL", () => {
    const url = "https://www.example.com/path?q=Hello";
    expect(payloadBits(encodeOptimized(url))).toBeLessThan(
      payloadBits(encodeMixed(url))
    );
    expect(payloadBits(encodeOptimized(url))).toBeLessThan(
      payloadBits(encodeByte(url, "utf-8"))
    );
  });

  it("is never longer than mixed encoding of the optimized payload", () => {
    const url = "https://www.example.com/path?q=Hello";
    const optimized = optimizeInput(url).text;
    expect(payloadBits(encodeOptimized(url))).toBe(
      payloadBits(encodeMixed(optimized))
    );
  });

  it("wires through encodeInput and parseBasic", () => {
    const url = "https://example.com/a?q=1";
    expect(payloadBits(encodeInput(OPTIMIZED_MODE, url))).toBe(
      payloadBits(encodeOptimized(url))
    );
    const parsed = parseBasic({ mode: "optimized", text: url });
    expect(parsed.data).toBe(url);
  });
});
