import { QRState } from "./types";

export enum Actions {
  ChangeInputs = "UPDATE_INPUTS",
  HighlightIds = "HIGHLIGHT_IDS",
  RemoveHighlightIds = "REMOVE_HIGHLIGHT_IDS",
  ClearHighlights = "CLEAR_HIGHLIGHTS",
  ToggleModule = "TOGGLE_MODULE",
}

export const initialQRState: QRState = {
  errorCorrectionLevel: 0,
  version: -1, // -1 means "auto"
  dataMask: -1, // -1 means "auto"
  inputs: [],
  matrix: [[]], // used when modified manually
  source: "inputs",
  error: "",
  highlightedIds: [],
  segments: [],
};

type QRAction =
  | { type: Actions.ChangeInputs; payload: Partial<QRState> }
  | { type: Actions.HighlightIds; ids: string | string[] }
  | { type: Actions.RemoveHighlightIds; ids: string[] }
  | { type: Actions.ClearHighlights }
  | { type: Actions.ToggleModule };

export function qrReducer(state: QRState, action: QRAction): QRState {
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
        highlightedIds: Array.isArray(action.ids)
          ? action.ids
          : [action.ids],
      };
    }

    case Actions.RemoveHighlightIds: {
      return {
        ...state,
        highlightedIds: state.highlightedIds.filter(
          (id) => !action.ids.includes(id)
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
