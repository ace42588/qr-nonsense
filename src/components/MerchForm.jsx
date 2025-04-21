import { useState, useContext, useEffect, useCallback } from "react";
import "./styles.css";

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";
import { Actions } from "../Constants";

import { encodeOrder, parseOrderJson } from "../utils/orderUtils";

const Encodings = ["JSON", "Alphanumeric", "PER"];

export default function MerchForm() {
  const [input, setInput] = useState(sampleInput);
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useContext(QRDataDispatchContext);

  const updateQRData = useCallback(
    (inputValue = input, encodingType = encoding) => {
      const order = parseOrderJson(inputValue);
      if (!order) return;
      const output = encodeOrder(order, encodingType);
      if (!output) return;
      dispatch({
        type: Actions.ChangeInput,
        inputs: [output],
      });
    },
    [dispatch, input, encoding]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  return (
    <form className="input-form">
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
        <div key={0} className="input-group">
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
          {}
          <textarea
            type="text"
            rows={16}
            value={input}
            onChange={(e) => {
              const newInput = e.target.value;
              setInput(newInput);
              updateQRData(newInput, encoding);
            }}
          />
        </div>
      </div>
      <div className="row">
        <button
          onClick={(e) => {
            e.preventDefault();
            const order = parseOrderJson(input);
            const output = encodeOrder(order, encoding);
            dispatch({
              type: Actions.ChangeInput,
              inputs: [output],
            });
          }}
        >
          Generate QR Code
        </button>
      </div>
    </form>
  );
}

const sampleOrder = {
  p: "A",
  cc: 133,
  txn: "99999",
  i: [
    {
      v: 5432,
      q: 1,
    },
    {
      v: 6666,
      q: 3,
    },
    {
      v: 1234,
      q: 2,
    },
  ],
};

const sampleInput = JSON.stringify(sampleOrder, null, 2);
