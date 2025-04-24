import { Actions } from "../../domain/qr/Constants";
import { getQRDataFromInputs } from "../../domain/qr/QRUtils";

export const initialData = {
  encodedInputs: [],
  errorCorrectionLevel: 0,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  segments: [],
  codewords: [],
  matrix: null,
};

export function dataReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInput: {
      const { inputs } = action;
      const newQRData = getQRDataFromInputs(
        inputs,
        state.errorCorrectionLevel,
        state.version,
        state.dataMask
      );
      const newState = {
        ...state,
        ...newQRData,
        inputs,
      };
      console.log({ newState });
      return newState;
    }
    case Actions.ChangeDataMask: {
      const { dataMask } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        state.errorCorrectionLevel,
        state.version,
        dataMask
      );
      return { ...state, ...newQRData, dataMask };
    }
    case Actions.ChangeVersion: {
      const { version } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        state.errorCorrectionLevel,
        version,
        state.dataMask
      );
      return { ...state, ...newQRData, version };
    }
    case Actions.ChangeErrorCorretionLevel: {
      const { errorCorrectionLevel } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        errorCorrectionLevel,
        state.version,
        state.dataMask
      );
      return { ...state, ...newQRData, errorCorrectionLevel };
    }
    case Actions.HighlightModules: {
      const { segment } = action;
      const modulesToUpdate = state.segmentMap.get(segment.id);
      const newMatrix = state.matrix.map((row) =>
        row.map((module) => {
          let { bit, isHighlighted } = module;
          const newModule = { ...module };
          if (bit.id && modulesToUpdate.some((id) => id === bit.id)) {
            newModule.isHighlighted = !isHighlighted;
          }
          return newModule;
        })
      );
      return {
        ...state,
        matrix: newMatrix,
      };
    }
    case Actions.HighlightSegment: {
      const { module } = action;
      const { bit, nonData } = module;
      if (nonData) {
        const {
          source: { name },
        } = module;
        const newMatrix = state.matrix.map((row) =>
          row.map((module) => {
            const newModule = { ...module };
            if (module.source && module.source.name === name)
              newModule.isHighlighted = !module.isHighlighted;
            return newModule;
          })
        );
        return { ...state, matrix: newMatrix };
      }
      const segmentToUpdate = state.bitMap.get(bit.id);
      if (!segmentToUpdate) return state;
      const newSegments = state.segments.map((segment) => {
        let { id, isHighlighted } = segment;
        const newSegment = { ...segment };
        if (id === segmentToUpdate.id)
          newSegment.isHighlighted = !isHighlighted;
        return newSegment;
      });
      return {
        ...state,
        segments: newSegments,
      };
    }
    default: {
      console.error("dataReducer", `Unrecognized action: ${action.type}`);
      return state;
    }
  }
}

/* ChatGPT recommended refactor....*/

export const initialQRState = {
  matrix: null,
  bitMap: null,
  selectedMask: null,
  calculatedVersion: null,
  segments: [],
  codewords: [],
};

export function qrReducer(state, action) {
  switch (action.type) {
    case "SET_MATRIX":
      return { ...state, matrix: action.payload };
    case "SET_BIT_MAP":
      return { ...state, bitMap: action.payload };
    case "SET_SELECTED_MASK":
      return { ...state, selectedMask: action.payload };
    case "SET_CALCULATED_VERSION":
      return { ...state, calculatedVersion: action.payload };
    case "SET_SEGMENTS":
      return { ...state, segments: action.payload };
    case "TOGGLE_HIGHLIGHT":
      return {
        ...state,
        segments: state.segments.map((s) =>
          s.id === action.payload
            ? { ...s, isHighlighted: !s.isHighlighted }
            : s
        ),
      };
    case "CLEAR_HIGHLIGHTS":
      return {
        ...state,
        segments: state.segments.map((s) => ({ ...s, isHighlighted: false })),
      };
    case "SET_CODEWORDS":
      return { ...state, codewords: action.payload };
    default:
      return state;
  }
}
