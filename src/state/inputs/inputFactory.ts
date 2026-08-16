import { jsonSchema } from "@/domain/input/serializationSchemas";
import { getTemplateDefaults } from "@/domain/input/templates";
import { Input, Field } from "./types";
import { generateId } from "@/domain/qr/utils/id";

export const DEFAULT_FIELD: Field = {
  id: generateId(),
  label: "Field",
  min: 0,
  max: 255,
  bitWidth: 8,
  type: "base10",
  mode: "bits",
};

interface StringTypeDefaults {
  type: "string";
  text: string;
  mode: string;
  encoding: string;
}

interface JsonTypeDefaults {
  type: "json";
  obj: any;
  schema: any;
  schemaName: string;
  encoding: string;
}

interface BitfieldTypeDefaults {
  type: "bitfield";
  layout: Field[];
  values: Record<string, any>;
}

interface MacTypeDefaults {
  type: "mac";
  algo: string;
  key: string;
  includedFields: string[];
}

interface TemplateTypeDefaults {
  type: "template";
  template: string;
  templateFields: Record<string, unknown>;
}

interface StructuredAppendTypeDefaults {
  type: "structuredAppend";
  mode: "structuredAppend";
  symbolIndex: number;
  totalSymbols: number;
  parity: number;
}

interface Fnc1TypeDefaults {
  type: "fnc1";
  mode: "fnc1";
  text: string;
  fnc1Position: "first" | "second";
  applicationIndicator: string;
  payloadMode: "alphanumeric" | "byte" | "numeric";
  encoding: string;
}

export type InputTypeDefaults = {
  string: StringTypeDefaults;
  json: JsonTypeDefaults;
  bitfield: BitfieldTypeDefaults;
  mac: MacTypeDefaults;
  template: TemplateTypeDefaults;
  structuredAppend: StructuredAppendTypeDefaults;
  fnc1: Fnc1TypeDefaults;
};

const inputTypeDefaults: InputTypeDefaults = {
  string: {
    type: "string",
    text: "Hello world",
    mode: "byte",
    encoding: "",
  },
  json: {
    type: "json",
    obj: {
      p: "A",
      cc: 133,
      txn: "99999",
      i: [
        { v: 5432, q: 1 },
        { v: 6666, q: 3 },
        { v: 1234, q: 2 },
      ],
    },
    schema: jsonSchema,
    schemaName: "jsonSchema",
    encoding: "None",
  },
  bitfield: {
    type: "bitfield",
    layout: [],
    values: {},
  },
  mac: {
    type: "mac",
    algo: "Poly1305",
    key: "supersecret",
    includedFields: [],
  },
  template: {
    type: "template",
    template: "wifi",
    templateFields: getTemplateDefaults("wifi"),
  },
  structuredAppend: {
    type: "structuredAppend",
    mode: "structuredAppend",
    symbolIndex: 0,
    totalSymbols: 2,
    parity: 0,
  },
  fnc1: {
    type: "fnc1",
    mode: "fnc1",
    text: "0101234567890128",
    fnc1Position: "first",
    applicationIndicator: "00",
    payloadMode: "alphanumeric",
    encoding: "utf-8",
  },
};

export function getInputTypeDefaults(type: keyof InputTypeDefaults = "string"): InputTypeDefaults[typeof type] {
  return {
    ...inputTypeDefaults[type],
  };
}

interface InputOptions {
  type?: keyof InputTypeDefaults;
  id?: string;
  label?: string;
  [key: string]: any;
}

export function createInput({
  type = "string",
  id,
  label = "New Input",
  ...overrides
}: InputOptions = {}): Input {
  const defaults = getInputTypeDefaults(type);
  const defaultsRec = defaults as unknown as Record<string, unknown>;
  const overridesRec = overrides as Record<string, unknown>;
  // Canonical string payload is `data`. Keep `text` in sync so UI and parsers agree.
  const text = String(
    overridesRec.data ??
      overridesRec.text ??
      defaultsRec.text ??
      defaultsRec.data ??
      ""
  );

  return {
    id: id || generateId(),
    label,
    ...defaults,
    ...overrides,
    data: text,
    text,
  } as Input;
}
