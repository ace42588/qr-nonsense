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

function calculateQRState(state, override = {}) {
  const {
    inputs = state.inputs,
    errorCorrectionLevel = state.errorCorrectionLevel,
    version = state.version,
    dataMask = state.dataMask,
  } = override;

  const newQRData = getQRDataFromInputs(
    inputs,
    errorCorrectionLevel,
    version,
    dataMask
  );
  return { ...state, ...newQRData, ...override };
}

export function dataReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInput: {
      return calculateQRState(state, { inputs: action.inputs });
    }
    case Actions.ChangeDataMask: {
      return calculateQRState(state, { dataMask: action.dataMask });
    }
    case Actions.ChangeVersion: {
      return calculateQRState(state, { version: action.version });
    }
    case Actions.ChangeErrorCorretionLevel: {
      return calculateQRState(state, {
        errorCorrectionLevel: action.errorCorrectionLevel,
      });
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
