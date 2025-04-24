import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css"; // Import your component-specific styles
import { QRInfoInput } from "../qr/QRInfoInput";
import { InputModeSelector } from "../selectors";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../domain/qr/Constants";

export function InputForm() {
  const [inputs, setInputs] = useState([
    { mode: "byte", data: "Hello world!" },
  ]);
  const dispatch = useQRDataDispatch();

  const updateQRData = useCallback(
    (inputValue = inputs) => {
      const parsed = inputs.map((i) => parseInput(i));
      //console.debug("updateQRData", { inputValue });
      dispatch({
        type: Actions.ChangeInput,
        inputs: parsed,
      });
    },
    [dispatch, inputs]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].data = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, {mode, encoding}) => {
    console.debug("handleModeChange", { index, mode });
    const newInputs = [...inputs];
    const input = newInputs[index];
    newInputs[index] = {...input, mode, encoding};
    console.debug("handleModeChange", { newInputs });
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, { mode: "byte", value: "" }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

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
          {inputs.map((input, index) => (
            <div key={index} className="input-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <InputModeSelector
                  mode={input.mode}
                  encoding={input.encoding}
                  onChange={(e) => handleModeChange(index, e)}
                />
              </div>
              <input
                type="text"
                value={input.data}
                onChange={(e) => handleInputChange(index, e)}
                placeholder={`Input ${index + 1}`}
              />
              <button type="button" onClick={() => handleRemoveInput(index)}>
                ✖
              </button>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="button" onClick={handleAddInput}>
            Add Input
          </button>
        </div>
      </div>
    </div>
  );
}

export default InputForm;
