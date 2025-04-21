import { useState, useContext, useEffect, useCallback } from "react";
import SchemaEditor from "./SchemaEditor";
import ItemsEditor from "./ItemsEditor";
import ItemGenerator from "./ItemGenerator";
import { schemaToObject } from "../utils/schemaUtils";
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector
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
    {
      label: "Items",
      name: "i",
      type: "array",
      children: [
        { label: "Variant", name: "v", type: "number", value: "" },
        { label: "Quantity", name: "q", type: "number", value: "" }
      ]
    }
  ]);
  const itemFieldNames = {
    orderKey: "i",
    variantKey: "v",
    quantityKey: "q",
  };
  const [orderSchema, setOrderSchema] = useState([
    { label: "Platform", name: "p", type: "string", value: "A" },
    { label: "Conference Code", name: "cc", type: "number", value: "133" },
    { label: "Transaction ID", name: "txn", type: "string", value: "99999" },
  ]);
  const [items, setItems] = useState([
    { [itemFieldNames.variantKey]: 5432, [itemFieldNames.quantityKey]: 1 },
    { [itemFieldNames.variantKey]: 6666, [itemFieldNames.quantityKey]: 3 },
    { [itemFieldNames.variantKey]: 1234, [itemFieldNames.quantityKey]: 2 },
  ]);
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useContext(QRDataDispatchContext);

  const requiredFieldNames = orderSchema.reduce((acc, field) => {
    if (field.label === "Platform") acc.platformKey = field.name;
    if (field.label === "Conference Code") acc.conferenceKey = field.name;
    if (field.label === "Transaction ID") acc.transactionKey = field.name;
    return acc;
  }, {});

  const finalOutput = buildFinalOrder(orderSchema, items, itemFieldNames);

  const updateQRData = useCallback(
    (
      orderSchemaValue = orderSchema,
      itemsValue = items,
      encodingType = encoding
    ) => {
      const order = buildFinalOrder(
        orderSchemaValue,
        itemsValue,
        itemFieldNames
      );
      if (!order) return;
      const output = encodeOrder(order, encodingType, {
        ...itemFieldNames,
        ...requiredFieldNames,
      });
      if (!output) return;
      dispatch({
        type: Actions.ChangeInput,
        inputs: [output],
      });
    },
    [dispatch, orderSchema, items, encoding]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  return (
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
      <div className="row">
        <OrderEncodingSelector encoding={encoding} setEncoding={setEncoding}/>
      </div>

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
  obj[fieldNames.orderKey] = items;
  return obj;
}
