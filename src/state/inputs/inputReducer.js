// state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";
import { createInput, updateInputById } from "../utils";
import { getTypeExtensions } from "../../domain";

export const Actions = {
  Add: "ADD",
  Remove: "REMOVE",
  Update: "UPDATE",
  Reorder: "REORDER",
  ChangeType: "CHANGE_TYPE",
};

export const initialInput = [
  {
    id: crypto.randomUUID(),
    type: "basic",
    label: "Input 0",
    mode: "byte",
    text: "Hello world",
    encoding: "utf-8",
  },
];

export function inputReducer(inputs, action) {
  switch (action.type) {
    case Actions.Add: {
      return [...inputs, {...initialInput, label: action.label}];
    }
    case Actions.Remove: {
      const id = action.payload;
      return inputs.filter((input) => input.id !== id);
    }
    case Actions.Update: {
      return updateInputById(inputs, action.id, action.partial);
    }
    case Actions.Reorder: {
      const { oldIndex, newIndex } = action;
      return arrayMove(inputs, oldIndex, newIndex);
    }
    case Actions.ChangeType: {
      return inputs.map((input) =>
        input.id === action.id
          ? {
              ...input,
              type: action.newType,
              ...getTypeExtensions(action.newType),
            }
          : input
      );
    }
    default:
      return inputs;
  }
}