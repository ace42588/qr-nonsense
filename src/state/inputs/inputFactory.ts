import { jsonSchema } from "@/domain/input/serializationSchemas.ts";
import { Input } from "@/types/index.ts";

export interface Field {
  label: string;
  min: number;
  max: number;
  bitWidth: number;
  type: string;
  mode: string;
}

export const DEFAULT_FIELD: Field = {
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

export type InputTypeDefaults = {
  string: StringTypeDefaults;
  json: JsonTypeDefaults;
  bitfield: BitfieldTypeDefaults;
  mac: MacTypeDefaults;
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
  return {
    id: id || crypto.randomUUID(),
    label,
    ...getInputTypeDefaults(type),
    ...overrides,
  };
} 