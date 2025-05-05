import { deriveFromInputs } from "./deriveFromInputs";
import { deriveInputsFromMatrix } from "./deriveFromMatrix";
import {
  getModulesToHighlight,
  getSegmentToHighlight,
  highlightModules,
  highlightSegment,
} from "./utils";

export const Actions = {
  ChangeInputs: "UPDATE_INPUTS",
  ChangeDataMask: "UPDATE_DATAMASK",
  ChangeVersion: "UPDATE_VERSION",
  ChangeErrorCorretionLevel: "UPDATE_ECL",
  HighlightSegment: "HIGHLIGHT_SEGMENT",
  ClearSegmentHighlight: "RESET_SEGMENT_HIGHLIGHT",
  HighlightModules: "HIGHLIGHT_MODULES",
  ClearSegmentHighlight: "RESET_MODULE_HIGHLIGHT",
  ToggleModule: "TOGGLE_MODULE",
};

export function qrReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInputs: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeDataMask: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeVersion: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeErrorCorretionLevel: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.HighlightSegment: {
      try {
        const module = action.payload;
        // highlight the other nondata modules
        if (module.nonData) {
          const {
            source: { name },
          } = module;
          const newMatrix = state.matrix.map((row) =>
            row.map((m) => {
              const newModule = { ...m };
              if (m.source && m.source.name === name)
                newModule.isHighlighted = !m.isHighlighted;
              return newModule;
            })
          );
          return { ...state, matrix: newMatrix };
        }
        return {
          ...state,
          segments: highlightSegment(module, state),
        };
      } catch (e) {
        console.error(e);
      }
      return state;
    }
    case Actions.HighlightModules: {
      try {
        const segment = action.payload;
        return {
          ...state,
          matrix: highlightModules(segment, state),
        };
      } catch (e) {
        console.error(e);
      }
      return state;
    }
    default: {
      return state;
    }
  }
}

export const initialQRState = {
  errorCorrectionLevel: 0,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  inputs: [],
  segments: [],
  codewords: [],
  matrix: [[]],
  source: "inputs",
  error: "",
};
