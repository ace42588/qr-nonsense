import { QRUtils } from "./Utilities";
import Encoders from "./Encoders";

export default function QRDataReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const chunk = Encoders(mode).encode(data, encoding);
      const newChunks = [...state.chunks, chunk];
      const finalBits = QRUtils.finalizeBitStream(
        newChunks,
        state.version,
        state.errorCorrectionLevel
      );
      return {
        ...state,
        sections: newChunks,
        bits: [...finalBits],
      };
    }
    case "HIGHLIGHT_DATA": {
    }
  }
}
