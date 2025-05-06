import {
  highlightModules,
  highlightSegment,
} from "./utils";

export const Actions = {
  ChangeInputs: "UPDATE_INPUTS",
  HighlightSegment: "HIGHLIGHT_SEGMENT",
  HighlightModules: "HIGHLIGHT_MODULES",
  ClearSegmentHighlight: "RESET_SEGMENT_HIGHLIGHT",
  ClearModuleHighlight: "RESET_MODULE_HIGHLIGHT",
  ToggleModule: "TOGGLE_MODULE",
};

export const initialQRState = {
  errorCorrectionLevel: 0,
  version: -1, // -1 means "auto"
  dataMask: -1, // -1 means "auto"
  inputs: [],
  matrix: [[]], // used when modified manually
  source: "inputs",
  error: "",
};

export function qrReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInputs: {
      return {
        ...state,
        ...action.payload,
      };
    }

    case Actions.HighlightSegment: {
      try {
        const module = action.payload;
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
        // If it's a data segment, leave it to the derived layer
        return state;
      } catch (e) {
        console.error(e);
        return state;
      }
    }

    case Actions.HighlightModules: {
      try {
        const segment = action.payload;
        return {
          ...state,
          matrix: highlightModules(segment, state.idMap, state.matrix),
        };
      } catch (e) {
        console.error(e);
        return state;
      }
    }

    default: {
      return state;
    }
  }
}