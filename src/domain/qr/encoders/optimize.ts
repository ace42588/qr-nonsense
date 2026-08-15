import { encodeMixed, resolveMixedParts, type MixedSegment } from "./mixed";
import type { Segment } from "@/domain/shared/types";

export const MIXED_MODE = "mixed";
export const AUTO_MODE = "auto";
export const OPTIMIZED_MODE = "optimized";

export type InputCategory =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "vcard"
  | "mecard"
  | "geo"
  | "plain";

export interface OptimizedInput {
  category: InputCategory;
  text: string;
  transformed: boolean;
}

const URL_SCHEME = /^(https?|ftp|ftps|ws|wss):\/\//i;
const WWW_PREFIX = /^www\./i;
const BARE_HOST_URL =
  /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;
const MAILTO = /^mailto:/i;
const EMAIL = /^(?:mailto:)?[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TEL = /^tel:/i;
const SMS = /^(sms|smsto|mms):/i;
const WIFI = /^wifi:/i;
const GEO = /^geo:/i;
const VCARD = /^begin:vcard\b/i;
const MECARD = /^mecard:/i;

export const CATEGORY_LABELS: Record<InputCategory, string> = {
  url: "URL",
  email: "email",
  phone: "phone",
  sms: "SMS",
  wifi: "Wi-Fi",
  vcard: "vCard",
  mecard: "MECARD",
  geo: "geo",
  plain: "plain text",
};

export function classifyInput(text: string): InputCategory {
  const value = text.trim();
  if (!value) return "plain";
  if (VCARD.test(value)) return "vcard";
  if (MECARD.test(value)) return "mecard";
  if (WIFI.test(value)) return "wifi";
  if (TEL.test(value)) return "phone";
  if (SMS.test(value)) return "sms";
  if (GEO.test(value)) return "geo";
  if (isUrl(value)) return "url";
  if (MAILTO.test(value) || EMAIL.test(value)) return "email";
  return "plain";
}

function isUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  if (URL_SCHEME.test(value) || WWW_PREFIX.test(value)) return true;
  return BARE_HOST_URL.test(value);
}

function indexOfAuthorityEnd(value: string): number {
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close === -1) return value.length;
    const after = value.slice(close + 1);
    const rel = after.search(/[/?#]/);
    return rel === -1 ? value.length : close + 1 + rel;
  }
  const rel = value.search(/[/?#]/);
  return rel === -1 ? value.length : rel;
}

function uppercaseHost(hostPort: string): string {
  if (hostPort.startsWith("[")) {
    const close = hostPort.indexOf("]");
    if (close === -1) return hostPort.toUpperCase();
    return hostPort.slice(0, close + 1).toUpperCase() + hostPort.slice(close + 1);
  }
  const colon = hostPort.lastIndexOf(":");
  if (colon !== -1 && /^\d+$/.test(hostPort.slice(colon + 1))) {
    return hostPort.slice(0, colon).toUpperCase() + hostPort.slice(colon);
  }
  return hostPort.toUpperCase();
}

function optimizeAuthority(authority: string): string {
  const at = authority.lastIndexOf("@");
  if (at === -1) return uppercaseHost(authority);
  return authority.slice(0, at + 1) + uppercaseHost(authority.slice(at + 1));
}

function optimizeUrl(text: string): string {
  const schemeMatch = text.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toUpperCase();
    const rest = schemeMatch[2];
    const split = indexOfAuthorityEnd(rest);
    return `${scheme}://${optimizeAuthority(rest.slice(0, split))}${rest.slice(split)}`;
  }
  const split = indexOfAuthorityEnd(text);
  return optimizeAuthority(text.slice(0, split)) + text.slice(split);
}

function optimizeEmail(text: string): string {
  const mailto = text.match(/^(mailto:)(.*)$/i);
  const payload = mailto ? mailto[2] : text;
  const at = payload.lastIndexOf("@");
  if (at === -1) return mailto ? `MAILTO:${payload}` : text;
  const local = payload.slice(0, at);
  const domain = payload.slice(at + 1).toUpperCase();
  const address = `${local}@${domain}`;
  return mailto ? `MAILTO:${address}` : address;
}

function optimizeSchemePrefix(text: string, scheme: string): string {
  return text.replace(new RegExp(`^${scheme}:`, "i"), `${scheme.toUpperCase()}:`);
}

function uppercasePrefixedKeys(text: string, prefix: string): string {
  const upper = prefix.toUpperCase();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let result = text.replace(new RegExp(`^${escaped}:`, "i"), `${upper}:`);
  result = result.replace(
    new RegExp(`(^${escaped}:|;)([A-Za-z][A-Za-z0-9-]*):`, "g"),
    (_full, sep: string, key: string) => `${sep}${key.toUpperCase()}:`
  );
  return result;
}

function optimizeVCard(text: string): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^([^:;]+)(.*)$/);
      if (!match) return line;
      const name = match[1].toUpperCase();
      const rest = match[2];
      if (name === "BEGIN" || name === "END") {
        return name + rest.toUpperCase();
      }
      return name + rest;
    })
    .join(newline);
}

export function optimizeInput(text: string): OptimizedInput {
  const source = text ?? "";
  if (!source) {
    return { category: "plain", text: source, transformed: false };
  }

  const category = classifyInput(source);
  let optimized = source;
  switch (category) {
    case "url":
      optimized = optimizeUrl(source);
      break;
    case "email":
      optimized = optimizeEmail(source);
      break;
    case "phone":
      optimized = optimizeSchemePrefix(source, "tel");
      break;
    case "sms":
      optimized = source.replace(/^(sms|smsto|mms):/i, (match) =>
        match.toUpperCase()
      );
      break;
    case "wifi":
      optimized = uppercasePrefixedKeys(source, "WIFI");
      break;
    case "vcard":
      optimized = optimizeVCard(source);
      break;
    case "mecard":
      optimized = uppercasePrefixedKeys(source, "MECARD");
      break;
    case "geo":
      optimized = optimizeSchemePrefix(source, "geo");
      break;
    default:
      optimized = source;
  }

  return {
    category,
    text: optimized,
    transformed: optimized !== source,
  };
}

export interface OptimizedPartsPlan {
  category: InputCategory;
  text: string;
  transformed: boolean;
  parts: MixedSegment[];
}

/**
 * Apply category-aware transforms, then split into the same mixed-mode parts
 * that optimized encoding would use (with byte fallback when mixed is not shorter).
 */
export function planOptimizedParts(
  text: string,
  options: { version?: number; encoding?: unknown } = {}
): OptimizedPartsPlan {
  const optimization = optimizeInput(text);
  return {
    category: optimization.category,
    text: optimization.text,
    transformed: optimization.transformed,
    parts: resolveMixedParts(optimization.text, options),
  };
}

export function encodeOptimized(
  text: string,
  options: { version?: number; encoding?: unknown } = {}
): Segment[] {
  return encodeMixed(optimizeInput(text).text, options);
}
