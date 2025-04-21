import { useState, useContext, useEffect, useCallback } from "react";
import SchemaEditor from "./SchemaEditor";
import ItemsEditor from "./ItemsEditor";
import ItemGenerator from "./ItemGenerator";
import { schemaToObject } from "../utils/schemaUtils";
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";
import { encodeOrder, parseOrderJson } from "../utils/orderUtils";
import { Actions } from "../Constants";

const Encodings = ["JSON", "Alphanumeric", "PER"];

export default function DynamicOrderEditor() {
  const [orderSchema, setOrderSchema] = useState([
    { label: "Platform", name: "p", type: "string", value: "A" },
    { label: "Conference Code", name: "cc", type: "number", value: "133" },
    { label: "Transaction ID", name: "txn", type: "string", value: "99999" },
  ]);
  const [items, setItems] = useState([
    { variant: 5432, quantity: 1 },
    { variant: 6666, quantity: 3 },
    { variant: 1234, quantity: 2 },
  ]);
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useContext(QRDataDispatchContext);

  const updateQRData = useCallback(
    (inputValue = finalOutput, encodingType = encoding) => {
      const order = parseOrderJson(inputValue);
      if (!order) return;
      const output = encodeOrder(order, encodingType);
      if (!output) return;
      dispatch({
        type: Actions.ChangeInput,
        inputs: [output],
      });
    },
    [dispatch, finalOutput, encoding]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  const itemFieldNames = {
    orderKey: "i",
    variantKey: "v",
    quantityKey: "q",
  };

  const finalOutput = buildFinalOrder(orderSchema, items, itemFieldNames);

  return (
    <div className="p-4 space-y-6">
      <div className="row">
        <ErrorCorrectionSelector />
      </div>
      <div className="row">
        <VersionSelector />
      </div>
      <div className="row">
        <DataMaskSelector />
      </div>
                <label htmlFor="encoding">Encoding:</label>
          <select
            id="encoding"
            value={encoding}
            onChange={(e) => {
              console.debug("handleChangeEncoding");
              const newEncoding = e.target.value;
              setEncoding(newEncoding);
              updateQRData(input, newEncoding);
            }}
          >
            {Encodings.map((encoding, idx) => (
              <option key={encoding} value={encoding}>
                {encoding}
              </option>
            ))}
          </select>

      <div className="border p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Order Fields</h2>
        <SchemaEditor schema={orderSchema} setSchema={setOrderSchema} />
      </div>

      <div className="border p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Order Items</h2>
        <ItemsEditor
          items={items}
          setItems={setItems}
          fieldNames={itemFieldNames}
        />
        <ItemGenerator onGenerate={setItems} fieldNames={itemFieldNames} />
      </div>

      <div className="border p-4 rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Output</h2>
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(finalOutput, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function buildFinalOrder(orderSchema, items, fieldNames) {
  const obj = schemaToObject(orderSchema);
  obj[fieldNames.orderKey] = items.map((item) => ({
    [fieldNames.variantKey]: item.variant,
    [fieldNames.quantityKey]: item.quantity,
  }));
  return obj;
}
