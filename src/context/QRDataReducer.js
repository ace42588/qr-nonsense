import { QRUtils } from "./Utilities";
import Encoders from "./Encoders";

export default function QRDataReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const section = Encoders(mode).encode(data, encoding);
      const newSections = [...state.sections, section];
      const finalBits = QRUtils.finalizeBitStream(
        newSections,
        state.version,
        state.errorCorrectionLevel
      );
      return {
        ...state,
        sections: newSections,
        bits: [...finalBits],
      };
    }
    case "HIGHLIGHT_DATA": {
    }
  }
}
