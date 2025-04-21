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

export default function DynamicOrderEditor() {
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useContext(QRDataDispatchContext);
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
        { label: "Quantity", name: "q", type: "number", value: "" },
      ],
    },
  ]);

  const requiredFieldNames = {};
  function traverseFields(fields) {
    for (const field of fields) {
      if (field.label === "Platform")
        requiredFieldNames.platformKey = field.name;
      if (field.label === "Conference Code")
        requiredFieldNames.conferenceKey = field.name;
      if (field.label === "Transaction ID")
        requiredFieldNames.transactionKey = field.name;
      if (field.label === "Items") requiredFieldNames.itemsKey = field.name;
      if (field.label === "Variant") requiredFieldNames.variantKey = field.name;
      if (field.label === "Quantity")
        requiredFieldNames.quantityKey = field.name;
      if (Array.isArray(field.children)) traverseFields(field.children);
    }
  }
  traverseFields(orderSchema);

  const variantKey = requiredFieldNames.variantKey;
  const quantityKey = requiredFieldNames.quantityKey;
  console.debug("DynamicOrderEditor",{variantKey,quantityKey});
  const [items, setItems] = useState([
    { [variantKey]: 5432, [quantityKey]: 1 },
    { [variantKey]: 6666, [quantityKey]: 3 },
    { [variantKey]: 1234, [quantityKey]: 2 },
  ]);
    console.debug("DynamicOrderEditor",{items});

  const finalOutput = buildFinalOrder(orderSchema, items, requiredFieldNames);

  const updateQRData = useCallback(
    (
      orderSchemaValue = orderSchema,
      itemsValue = items,
      encodingType = encoding
    ) => {
      const order = buildFinalOrder(
        orderSchemaValue,
        itemsValue,
        requiredFieldNames
      );
      if (!order) return;
      const output = encodeOrder(order, encodingType, requiredFieldNames);
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
        <OrderEncodingSelector encoding={encoding} setEncoding={setEncoding} />
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
          fieldNames={requiredFieldNames}
        />
        <ItemGenerator onGenerate={setItems} fieldNames={requiredFieldNames} />
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
