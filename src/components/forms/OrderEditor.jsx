import { useState, useContext, useEffect, useCallback } from "react";
import SchemaEditor from "./SchemaEditor";
import ItemsEditor from "./ItemsEditor";
import ItemGenerator from "./ItemGenerator";
import { schemaToObject } from "../../utils/schemaUtils";
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector,
} from "../selectors/Selectors";
import { useQRDataDispatch, SchemaContext } from "../../state";
import { encodeOrder } from "../../utils/orderUtils";
import { Actions } from "../../domain/qr/Constants";

const defaultSchema = [
  { label: "Platform", name: "p", type: "string", value: "A" },
  { label: "Conference Code", name: "cc", type: "number", value: "133" },
  { label: "Transaction ID", name: "txn", type: "string", value: "99999" },
  {
    label: "Items",
    name: "i",
    type: "array",
    children: [
      { label: "Variant", name: "v", type: "number", value: "5432" },
      { label: "Quantity", name: "q", type: "number", value: "1" },
    ],
  },
];

const extractInitialData = (schema) => {
  const obj = {};
  for (const field of schema) {
    if (!field.name) continue;
    if (field.type === "string" || field.type === "number") {
      obj[field.name] =
        field.type === "number" ? parseFloat(field.value) : field.value;
    } else if (field.type === "object") {
      obj[field.name] = extractInitialData(field.children || []);
    } else if (field.type === "array") {
      obj[field.name] = [extractInitialData(field.children || [])];
    }
  }
  return obj;
};

export default function DynamicOrderEditor() {
  const [schema, setSchema] = useState(defaultSchema);
  const [data, setData] = useState(() => extractInitialData(defaultSchema));
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useQRDataDispatch();

  const getFieldNames = (schema) => {
    const result = {};
    const walk = (fields) => {
      for (const field of fields) {
        if (field.label === "Platform") result.platformKey = field.name;
        if (field.label === "Conference Code")
          result.conferenceKey = field.name;
        if (field.label === "Transaction ID")
          result.transactionKey = field.name;
        if (field.label === "Items") result.itemsKey = field.name;
        if (field.label === "Variant") result.variantKey = field.name;
        if (field.label === "Quantity") result.quantityKey = field.name;
        if (Array.isArray(field.children)) walk(field.children);
      }
    };
    walk(schema);
    return result;
  };

  const requiredFieldNames = getFieldNames(schema);

  const updateQRData = useCallback(
    (orderSchemaValue = schema, dataValue = data, encodingType = encoding) => {
      console.debug("updateQRData", {
        orderSchemaValue,
        dataValue,
        encodingType,
      });
      const output = encodeOrder(data, encodingType, requiredFieldNames);
      if (!output) return;
      dispatch({
        type: Actions.ChangeInput,
        inputs: [output],
      });
    },
    [dispatch, schema, data, encoding]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  return (
    <SchemaContext.Provider
      value={{ schema, setSchema, data, setData, requiredFieldNames }}
    >
      <div className="input-form">
        <div className="row">
          <ErrorCorrectionSelector />
        </div>
        <div className="row">
          <VersionSelector />
        </div>
        <div className="row">
          <DataMaskSelector />
        </div>
        <div>
          <OrderEncodingSelector
            encoding={encoding}
            setEncoding={setEncoding}
          />
        </div>
        <SchemaEditor />
        <ItemGenerator />
        <div className="border p-4 mt-4 rounded bg-gray-100">
          <h2 className="text-lg font-semibold mb-2">Output</h2>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </SchemaContext.Provider>
  );
}
