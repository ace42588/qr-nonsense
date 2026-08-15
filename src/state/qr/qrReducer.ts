import { QRState } from "./types";

export enum Actions {
  HighlightIds = "HIGHLIGHT_IDS",
  ClearHighlights = "CLEAR_HIGHLIGHTS",
}

export const initialQRState: QRState = {
  highlightedIds: [],
};

type QRAction =
  | { type: Actions.HighlightIds; ids: string | string[] }
  | { type: Actions.ClearHighlights };

export function qrReducer(state: QRState, action: QRAction): QRState {
  switch (action.type) {
    case Actions.HighlightIds: {
      return {
        ...state,
        highlightedIds: Array.isArray(action.ids) ? action.ids : [action.ids],
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
