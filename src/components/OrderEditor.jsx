import { useState, useContext, useEffect, useCallback } from "react";
import SchemaEditor from "./SchemaEditor";
import ItemsEditor from "./ItemsEditor";
import ItemGenerator from "./ItemGenerator";
import { schemaToObject } from "../utils/schemaUtils";
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";
import { encodeOrder } from "../utils/orderUtils";
import { Actions } from "../Constants";

import { SchemaContext } from "../context/SchemaContext";

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

export default function DynamicOrderEditor() {
  const [schema, setSchema] = useState(defaultSchema);
    const [encoding, setEncoding] = useState("PER");
  const dispatch = useContext(QRDataDispatchContext);

  const getFieldNames = (schema) => {
    const result = {};
    const walk = (fields) => {
      for (const field of fields) {
        if (field.label === "Platform") result.platformKey = field.name;
        if (field.label === "Conference Code") result.conferenceKey = field.name;
        if (field.label === "Transaction ID") result.transactionKey = field.name;
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
  const data = schemaToObject(schema);
  
    const updateQRData = useCallback(
    (
      orderSchemaValue = schema,
      dataValue = data,
      encodingType = encoding
    ) => {
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
    <SchemaContext.Provider value={{ schema, setSchema, requiredFieldNames }}>
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-semibold">Schema Builder</h2>
        <SchemaEditor />
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
