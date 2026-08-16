import { QRState } from "./types";

export enum Actions {
  HighlightIds = "HIGHLIGHT_IDS",
  ClearHighlights = "CLEAR_HIGHLIGHTS",
  ToggleDamageModule = "TOGGLE_DAMAGE_MODULE",
  SetDamagedModules = "SET_DAMAGED_MODULES",
  ClearDamage = "CLEAR_DAMAGE",
}

export const initialQRState: QRState = {
  highlightedIds: [],
  damagedModuleIds: [],
};

type QRAction =
  | { type: Actions.HighlightIds; ids: string | string[] }
  | { type: Actions.ClearHighlights }
  | { type: Actions.ToggleDamageModule; moduleId: string }
  | { type: Actions.SetDamagedModules; moduleIds: string[] }
  | { type: Actions.ClearDamage };

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

    case Actions.ToggleDamageModule: {
      const { moduleId } = action;
      const exists = state.damagedModuleIds.includes(moduleId);
      return {
        ...state,
        damagedModuleIds: exists
          ? state.damagedModuleIds.filter((id) => id !== moduleId)
          : [...state.damagedModuleIds, moduleId],
      };
    }

    case Actions.SetDamagedModules: {
      // Union with existing damage so presets accumulate unless cleared
      const merged = new Set([
        ...state.damagedModuleIds,
        ...action.moduleIds,
      ]);
      return {
        ...state,
        damagedModuleIds: Array.from(merged),
      };
    }

    case Actions.ClearDamage: {
      return {
        ...state,
        damagedModuleIds: [],
      };
    }

    default: {
      return state;
    }
  }
}
