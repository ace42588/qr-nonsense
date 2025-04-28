import { useState, useContext, useEffect, useCallback } from "react";
import { QRInfoInput } from "../qr/QRInfoInput";
import "../styles/styles.css";

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector,
  InputModeSelector
} from "../selectors";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../state/qr/Constants";

import { encodeOrder, parseOrderJson } from "../../utils/orderUtils";

export function MerchForm() {
  const [order, setOrder] = useState(sampleInput);
  const [encoding, setEncoding] = useState("PER");
  const [headers, setHeaders] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const dispatch = useQRDataDispatch();

  const updateQRData = useCallback(
    (inputValue = order, encodingType = encoding, inputHeaders = headers, inputTrailers = trailers) => {
      const order = parseOrderJson(inputValue);
      if (!order) return;
      const encoded = encodeOrder(order, encodingType);
      if (!encoded) return;
      dispatch({
        type: Actions.ChangeInputs,
        payload: { inputs: [...inputHeaders, encoded, ...inputTrailers] },
      });
    },
    [dispatch, order, encoding, headers, trailers]
  );

  const handleInputChange = (index, event) => {
    const newInputs = [...order];
    newInputs[index].data = event.target.value;
    setOrder(newInputs);
  };

  const handleModeChange = (inputs, input, index, { mode, encoding }) => {
    console.debug("handleModeChange", { index, mode });
    const newInputs = [...inputs];
    newInputs[index] = { ...input, mode, encoding };
    console.debug("handleModeChange", { newInputs });
    setOrder(newInputs);
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { mode: "byte", value: "" }]);
  };

  const handleRemoveHeader = (index) => {
    const newInputs = headers.filter((_, i) => i !== index);
    setHeaders(newInputs);
  };

  const handleAddTrailer = () => {
    setTrailers([...trailers, { mode: "byte", value: "" }]);
  };

  const handleRemoveTrailer = (index) => {
    const newInputs = trailers.filter((_, i) => i !== index);
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
          <button type="button" onClick={handleAddHeader}>
            Add Header
          </button>
          {headers.map((header, index) => (
            <div key={index} className="input-group">
              <InputModeSelector
                mode={header.mode}
                encoding={header.encoding}
                onChange={({mode, encoding}) => {
                  const newHeaders = [...headers];
                  newHeaders[index] = {...header, mode, encoding};
                  setHeaders(newHeaders);
                  updateQRData();
                }}
              />
              <div className="input-button-row">
                <input
                  type="text"
                  value={header.data}
                  onChange={(e) => handleInputChange(index, e)}
                  placeholder={`Header ${index + 1}`}
                />
                <button type="button" onClick={() => handleRemoveHeader(index)}>
                  ✖
                </button>
              </div>
            </div>
          ))}
          <div key={0} className="input-group">
            <textarea
              type="text"
              rows={16}
              value={order}
              onChange={(e) => {
                const newInput = e.target.value;
                setOrder(newInput);
                updateQRData(newInput, encoding);
              }}
            />
          </div>
          <div>
            <OrderEncodingSelector
              encoding={encoding}
              setEncoding={setEncoding}
            />
          </div>
          {trailers.map((trailer, index) => (
            <div key={index} className="input-group">
              <InputModeSelector
                mode={trailer.mode}
                encoding={trailer.encoding}
                onChange={(e) => handleModeChange(index, e)}
              />
              <div className="input-button-row">
                <input
                  type="text"
                  value={trailer.data}
                  onChange={(e) => handleInputChange(index, e)}
                  placeholder={`Trailer ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTrailer(index)}
                >
                  ✖
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={handleAddTrailer}>
            Add Trailer
          </button>
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
