import { useState, useContext, useEffect, useCallback } from "react";
import { QRInfoInput } from "../qr/QRInfoInput";
import "../styles/styles.css";

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector,
} from "../selectors";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../state/qr/Constants";

import { encodeOrder, parseOrderJson } from "../../utils/orderUtils";

export function MerchForm() {
  const [input, setInput] = useState(sampleInput);
  const [encoding, setEncoding] = useState("PER");
  const dispatch = useQRDataDispatch();

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
    <div className="input-form">
      <QRInfoInput />
      <div className="row">
        <div
          style={{
            border: "1px solid #aaa",
            borderRadius: 8,
            padding: 16,
            maxWidth: 900,
          }}
        >
          <div key={0} className="input-group">
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
          <div>
        <OrderEncodingSelector encoding={encoding} setEncoding={setEncoding} />
      </div>
        </div>
      </div>
    </div>
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
