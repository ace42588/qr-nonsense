// state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";

export const Actions = {
  Add: "ADD",
  Remove: "REMOVE",
  Update: "UPDATE",
  Reorder: "REORDER",
};

export function inputReducer(state, action) {
  switch (action.type) {
    case Actions.Add: {
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          label: action.label,
          mode: "byte",
          data: "",
        },
      ];
    }
    case Actions.Remove: {
      const id = action.payload;
      return state.filter((input) => input.id !== id);
    }
    case Actions.Update: {
      return state.map((input) =>
        input.id === action.id ? { ...input, ...action.payload } : input
      );
    }
    case Actions.Reorder: {
      const { oldIndex, newIndex } = action;
      return arrayMove(state, oldIndex, newIndex);
    }
    default:
      return state;
  }
}

export const initialInputs = [
  {
    id: crypto.randomUUID(),
    label: "Input 0",
    mode: "byte",
    data: "Hello world",
  },
];
