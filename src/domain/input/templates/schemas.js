/** @typedef {"text" | "password" | "select" | "checkbox" | "textarea" | "number"} FieldType */

/**
 * @typedef {Object} TemplateFieldDef
 * @property {string} key
 * @property {string} label
 * @property {FieldType} type
 * @property {boolean} [required]
 * @property {string} [placeholder]
 * @property {{ value: string, label: string }[]} [options]
 * @property {*} [defaultValue]
 */

/**
 * @typedef {Object} TemplateSchema
 * @property {string} id
 * @property {string} label
 * @property {TemplateFieldDef[]} fields
 */

/** @type {Record<string, TemplateSchema>} */
export const TEMPLATE_SCHEMAS = {
  wifi: {
    id: "wifi",
    label: "Wi-Fi",
    fields: [
      {
        key: "ssid",
        label: "Network name (SSID)",
        type: "text",
        required: true,
        placeholder: "MyNetwork",
        defaultValue: "",
      },
      {
        key: "password",
        label: "Password",
        type: "text",
        required: false,
        placeholder: "Optional for open networks",
        defaultValue: "",
      },
      {
        key: "auth",
        label: "Security",
        type: "select",
        required: true,
        defaultValue: "WPA",
        options: [
          { value: "WPA", label: "WPA/WPA2" },
          { value: "WPA3", label: "WPA3" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "None" },
        ],
      },
      {
        key: "hidden",
        label: "Hidden network",
        type: "checkbox",
        required: false,
        defaultValue: false,
      },
    ],
  },
  vcard: {
    id: "vcard",
    label: "vCard",
    fields: [
      {
        key: "firstName",
        label: "First name",
        type: "text",
        required: false,
        defaultValue: "",
      },
      {
        key: "lastName",
        label: "Last name",
        type: "text",
        required: false,
        defaultValue: "",
      },
      {
        key: "fullName",
        label: "Display name",
        type: "text",
        required: true,
        placeholder: "Jane Doe",
        defaultValue: "",
      },
      {
        key: "organization",
        label: "Organization",
        type: "text",
        required: false,
        defaultValue: "",
      },
      {
        key: "phone",
        label: "Phone",
        type: "text",
        required: false,
        placeholder: "+1 555 0100",
        defaultValue: "",
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        required: false,
        placeholder: "jane@example.com",
        defaultValue: "",
      },
      {
        key: "url",
        label: "URL",
        type: "text",
        required: false,
        placeholder: "https://example.com",
        defaultValue: "",
      },
    ],
  },
  url: {
    id: "url",
    label: "URL",
    fields: [
      {
        key: "url",
        label: "URL",
        type: "text",
        required: true,
        placeholder: "https://example.com",
        defaultValue: "",
      },
    ],
  },
  email: {
    id: "email",
    label: "Email",
    fields: [
      {
        key: "address",
        label: "Email address",
        type: "text",
        required: true,
        placeholder: "jane@example.com",
        defaultValue: "",
      },
      {
        key: "subject",
        label: "Subject",
        type: "text",
        required: false,
        defaultValue: "",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        required: false,
        defaultValue: "",
      },
    ],
  },
  phone: {
    id: "phone",
    label: "Phone",
    fields: [
      {
        key: "number",
        label: "Phone number",
        type: "text",
        required: true,
        placeholder: "+15550100",
        defaultValue: "",
      },
    ],
  },
  sms: {
    id: "sms",
    label: "SMS",
    fields: [
      {
        key: "number",
        label: "Phone number",
        type: "text",
        required: true,
        placeholder: "+15550100",
        defaultValue: "",
      },
      {
        key: "message",
        label: "Message",
        type: "textarea",
        required: false,
        defaultValue: "",
      },
    ],
  },
  geo: {
    id: "geo",
    label: "Geo",
    fields: [
      {
        key: "latitude",
        label: "Latitude",
        type: "number",
        required: true,
        placeholder: "37.7749",
        defaultValue: "",
      },
      {
        key: "longitude",
        label: "Longitude",
        type: "number",
        required: true,
        placeholder: "-122.4194",
        defaultValue: "",
      },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_SCHEMAS);

export function getTemplateDefaults(kind) {
  const schema = TEMPLATE_SCHEMAS[kind];
  if (!schema) return {};
  const defaults = {};
  for (const field of schema.fields) {
    defaults[field.key] =
      field.defaultValue !== undefined ? field.defaultValue : "";
  }
  return defaults;
}
