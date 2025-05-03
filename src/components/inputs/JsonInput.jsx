import { useState, useContext, useEffect, useCallback } from "react";
import { QRInfoInput } from "../qr/QRInfoInput";
import "../styles/styles.css";

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  OrderEncodingSelector,
  InputModeSelector,
} from "../selectors";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../state/qr/Constants";

import { encodeOrder, parseOrderJson } from "../../utils/orderUtils";

export function MerchForm({ key, input, onChange, onRemove }) {
  const [encoding, setEncoding] = useState("PER");
  
    const handleInputChange = (event) => {
    const newInput = {...input, data: event.target.value};
    onChange(newInput);
  };

  const handleEncodingChange = (event) => {
    const newInput = { ...input, mode, encoding };
    setEncoding
    onChange(newInput);
  };

return (
  <div
          style={{
            border: "1px solid #aaa",
            borderRadius: 8,
            padding: 16,
            maxWidth: 900,
          }}
        >
    <div key={key} className="input-group">
            <textarea
              type="text"
              rows={16}
              value={input}
              onChange={(e) => {handleInputChange(e)}}
            />
          </div>
          <div>
            <OrderEncodingSelector
              encoding={encoding}
              setEncoding={setEncoding}
            />
          </div>
  </div>);
}