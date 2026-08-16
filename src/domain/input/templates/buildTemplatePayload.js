import { TEMPLATE_SCHEMAS, getTemplateDefaults } from "./schemas";

function str(value) {
  if (value == null) return "";
  return String(value).trim();
}

/** Escape special characters for WIFI: payloads. */
export function escapeWifiValue(value) {
  return String(value ?? "").replace(/([\\;,:"])/g, "\\$1");
}

/** Escape special characters for vCard property values. */
export function escapeVCardValue(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function requireFields(fields, keys) {
  for (const key of keys) {
    if (!str(fields[key])) {
      throw new Error(`Missing required field: ${key}`);
    }
  }
}

function buildWifi(fields) {
  requireFields(fields, ["ssid"]);
  const auth = str(fields.auth) || "WPA";
  const ssid = escapeWifiValue(str(fields.ssid));
  const password = escapeWifiValue(str(fields.password));
  const hidden = fields.hidden === true || fields.hidden === "true";

  let payload = `WIFI:T:${auth};S:${ssid};`;
  if (auth !== "nopass" && password) {
    payload += `P:${password};`;
  }
  if (hidden) {
    payload += "H:true;";
  }
  return `${payload};`;
}

function buildVCard(fields) {
  const firstName = str(fields.firstName);
  const lastName = str(fields.lastName);
  let fullName = str(fields.fullName);
  if (!fullName) {
    fullName = [firstName, lastName].filter(Boolean).join(" ");
  }
  if (!fullName) {
    throw new Error("Missing required field: fullName");
  }

  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`);
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  const org = str(fields.organization);
  if (org) lines.push(`ORG:${escapeVCardValue(org)}`);

  const phone = str(fields.phone);
  if (phone) lines.push(`TEL:${escapeVCardValue(phone)}`);

  const email = str(fields.email);
  if (email) lines.push(`EMAIL:${escapeVCardValue(email)}`);

  const url = str(fields.url);
  if (url) lines.push(`URL:${escapeVCardValue(url)}`);

  lines.push("END:VCARD");
  return lines.join("\n");
}

const BARE_HOST =
  /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

function buildUrl(fields) {
  requireFields(fields, ["url"]);
  let url = str(fields.url);
  if (
    !/^[a-z][a-z0-9+.-]*:/i.test(url) &&
    (url.startsWith("www.") || BARE_HOST.test(url))
  ) {
    url = `https://${url}`;
  }
  return url;
}

function buildEmail(fields) {
  requireFields(fields, ["address"]);
  const address = str(fields.address);
  const subject = str(fields.subject);
  const body = str(fields.body);
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return `mailto:${address}${query}`;
}

function buildPhone(fields) {
  requireFields(fields, ["number"]);
  return `tel:${str(fields.number)}`;
}

function buildSms(fields) {
  requireFields(fields, ["number"]);
  const number = str(fields.number);
  const message = str(fields.message);
  return message ? `smsto:${number}:${message}` : `smsto:${number}`;
}

function buildGeo(fields) {
  requireFields(fields, ["latitude", "longitude"]);
  const lat = Number(fields.latitude);
  const lon = Number(fields.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Latitude and longitude must be valid numbers");
  }
  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (lon < -180 || lon > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  return `geo:${lat},${lon}`;
}

const BUILDERS = {
  wifi: buildWifi,
  vcard: buildVCard,
  url: buildUrl,
  email: buildEmail,
  phone: buildPhone,
  sms: buildSms,
  geo: buildGeo,
};

/**
 * Build a QR string payload for a template kind.
 * @param {string} kind
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function buildTemplatePayload(kind, fields = {}) {
  const schema = TEMPLATE_SCHEMAS[kind];
  if (!schema) {
    throw new Error(`Unknown template: ${kind}`);
  }
  const builder = BUILDERS[kind];
  const merged = { ...getTemplateDefaults(kind), ...fields };
  return builder(merged);
}
