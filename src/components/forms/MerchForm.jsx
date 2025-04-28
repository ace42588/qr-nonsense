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
  const [order, setOrder] = useState(sampleInput);
  const [encoding, setEncoding] = useState("PER");
  const [headers, setHeaders] = useState();
  const [trailers, setTrailers] = useState();
  const dispatch = useQRDataDispatch();
  

  const updateQRData = useCallback(
    (inputValue = order, encodingType = encoding) => {
      const order = parseOrderJson(inputValue);
      if (!order) return;
      const output = encodeOrder(order, encodingType);
      if (!output) return;
      dispatch({
        type: Actions.ChangeInputs,
        payload: { inputs: [output] },
      });
    },
    [dispatch, order, encoding]
  );
  
  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].data = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, { mode, encoding }) => {
    console.debug("handleModeChange", { index, mode });
    const newInputs = [...inputs];
    const input = newInputs[index];
    newInputs[index] = { ...input, mode, encoding };
    console.debug("handleModeChange", { newInputs });
    setInputs(newInputs);
  };

  const handleAddHeader = () => {
    setHeaders([...inputs, { mode: "byte", value: "" }]);
  };

  const handleRemoveHeader = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setHeaders(newInputs);
  };

    const handleAddTrailer = () => {
    setTrailers([...inputs, { mode: "byte", value: "" }]);
  };

  const handleRemoveTrailer = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setTrailers(newInputs);
  };

  
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
            <button type="button" onClick={handleAddInput}>
            Add Header
          </button>
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
            <button type="button" onClick={handleAddInput}>
            Add Trailer
          </button>
          </div>
          <div>
            <OrderEncodingSelector
              encoding={encoding}
              setEncoding={setEncoding}
            />
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
