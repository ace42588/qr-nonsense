import { highlightModules, highlightSegment } from "./utils";

export const Actions = {
  ChangeInputs: "UPDATE_INPUTS",
  HighlightIds: "HIGHLIGHT_IDS",
  RemoveHighlightIds: "REMOVE_HIGHLIGHT_IDS",
  ClearHighlights: "CLEAR_HIGHLIGHTS",
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
  highlightedIds: [],
};

export function qrReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInputs: {
      return {
        ...state,
        ...action.payload,
      };
    }

    case Actions.HighlightIds: {
      return {
        ...state,
        highlightedIds: Array.isArray(action.payload)
          ? action.payload
          : [action.payload],
      };
    }

    case Actions.RemoveHighlightIds: {
      return {
        ...state,
        highlightedIds: state.highlightedIds.filter(
          (id) => !action.payload.includes(id)
        ),
      };
    }

    case Actions.ClearHighlights: {
      return {
        ...state,
        highlightedIds: [],
      };
    }

    default: {
      return state;
    }
  }
}
