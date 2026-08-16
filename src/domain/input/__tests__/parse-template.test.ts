import { describe, it, expect } from "vitest";
import {
  buildTemplatePayload,
  escapeWifiValue,
  escapeVCardValue,
} from "@/domain/input/templates";
import { parseTemplate } from "@/domain/input/parsers/parseTemplate";
import { parseAll, collectParseErrors } from "@/domain/input";
import { createInput } from "@/state/inputs/inputFactory";

describe("template escaping", () => {
  it("escapes Wi-Fi special characters", () => {
    expect(escapeWifiValue(`a;b,c:d\\e"f`)).toBe(`a\\;b\\,c\\:d\\\\e\\"f`);
  });

  it("escapes vCard special characters", () => {
    expect(escapeVCardValue("Doe; Jr")).toBe("Doe\\; Jr");
    expect(escapeVCardValue("a,b")).toBe("a\\,b");
    expect(escapeVCardValue("a\\b")).toBe("a\\\\b");
  });
});

describe("buildTemplatePayload", () => {
  it("builds a Wi-Fi payload with escaping", () => {
    expect(
      buildTemplatePayload("wifi", {
        ssid: "Cafe;Net",
        password: "p:ass,word",
        auth: "WPA",
        hidden: false,
      })
    ).toBe("WIFI:T:WPA;S:Cafe\\;Net;P:p\\:ass\\,word;;");
  });

  it("builds a Wi-Fi payload with WPA3", () => {
    expect(
      buildTemplatePayload("wifi", {
        ssid: "Secure",
        password: "secret",
        auth: "WPA3",
      })
    ).toBe("WIFI:T:WPA3;S:Secure;P:secret;;");
  });
    expect(
      buildTemplatePayload("wifi", {
        ssid: "Open",
        password: "",
        auth: "nopass",
      })
    ).toBe("WIFI:T:nopass;S:Open;;");
  });

  it("includes hidden flag when set", () => {
    expect(
      buildTemplatePayload("wifi", {
        ssid: "Hidden",
        auth: "WPA",
        password: "x",
        hidden: true,
      })
    ).toBe("WIFI:T:WPA;S:Hidden;P:x;H:true;;");
  });

  it("builds a vCard 3.0 structure", () => {
    const payload = buildTemplatePayload("vcard", {
      firstName: "Jane",
      lastName: "Doe",
      fullName: "Jane Doe",
      organization: "Acme",
      phone: "+15550100",
      email: "jane@example.com",
      url: "https://example.com",
    });
    expect(payload).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Doe;Jane;;;",
        "FN:Jane Doe",
        "ORG:Acme",
        "TEL:+15550100",
        "EMAIL:jane@example.com",
        "URL:https://example.com",
        "END:VCARD",
      ].join("\n")
    );
  });

  it("prefixes bare hosts with https://", () => {
    expect(buildTemplatePayload("url", { url: "example.com/path" })).toBe(
      "https://example.com/path"
    );
  });

  it("builds mailto with subject and body query", () => {
    expect(
      buildTemplatePayload("email", {
        address: "a@b.com",
        subject: "Hi there",
        body: "Hello & welcome",
      })
    ).toBe("mailto:a@b.com?subject=Hi%20there&body=Hello%20%26%20welcome");
  });

  it("builds tel and smsto payloads", () => {
    expect(buildTemplatePayload("phone", { number: "+15550100" })).toBe(
      "tel:+15550100"
    );
    expect(
      buildTemplatePayload("sms", { number: "+15550100", message: "Hi" })
    ).toBe("smsto:+15550100:Hi");
    expect(buildTemplatePayload("sms", { number: "+15550100" })).toBe(
      "smsto:+15550100"
    );
  });

  it("builds geo payloads and validates ranges", () => {
    expect(
      buildTemplatePayload("geo", { latitude: "37.7749", longitude: "-122.4194" })
    ).toBe("geo:37.7749,-122.4194");
    expect(() =>
      buildTemplatePayload("geo", { latitude: "100", longitude: "0" })
    ).toThrow(/Latitude/);
  });

  it("throws on missing required fields", () => {
    expect(() => buildTemplatePayload("wifi", { ssid: "" })).toThrow(
      /ssid/
    );
  });
});

describe("parseTemplate", () => {
  it("returns byte/utf-8 data on success", () => {
    const parsed = parseTemplate({
      id: "t1",
      type: "template",
      template: "phone",
      templateFields: { number: "+1" },
      data: "",
      mode: "",
    });
    expect(parsed.data).toBe("tel:+1");
    expect(parsed.mode).toBe("byte");
    expect(parsed.encoding).toBe("utf-8");
    expect(parsed.error).toBeUndefined();
  });

  it("returns error when required fields are missing", () => {
    const parsed = parseTemplate({
      id: "t2",
      type: "template",
      template: "wifi",
      templateFields: { ssid: "" },
      data: "",
      mode: "",
    });
    expect(parsed.error).toMatch(/ssid/);
    expect(parsed.data).toBe("");
  });

  it("integrates with parseAll", () => {
    const input = createInput({
      type: "template",
      id: "tpl-1",
      label: "WiFi",
      template: "wifi",
      templateFields: {
        ssid: "Net",
        password: "secret",
        auth: "WPA",
        hidden: false,
      },
    });
    const parsed = parseAll([input]);
    expect(parsed["tpl-1"].data).toBe("WIFI:T:WPA;S:Net;P:secret;;");
    expect(collectParseErrors(parsed)).toEqual({});
  });
});
