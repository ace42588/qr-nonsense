import {
  arrayMove,
} from "@dnd-kit/sortable";

export function inputReducer(state, action) {
  switch (action.type) {
    case "add":
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          label: action.label,
          mode: "byte",
          data: "",
        },
      ];
    case "remove":
      return state.filter((input) => input.id !== action.id);
    case "update":
      return state.map((input) =>
        input.id === action.id ? { ...input, ...action.payload } : input
      );
    case "reorder": {
      const { oldIndex, newIndex } = action;
      return arrayMove(state, oldIndex, newIndex);
    }
    default:
      return state;
  }
}

export const initialInput = {
  id: crypto.randomUUID(),
  label: "Input 0",
  mode: "byte",
  data: "Hello world",
};