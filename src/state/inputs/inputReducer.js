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
  ChangeMeta: "CHANGE_META",
  SetInputs: "SET_INPUTS",
  UpdateSchema: "UPDATE_SERIALIZATION_SCHEMA",
  UpdateEncoding: "UPDATE_ENCODING_STRATEGY"
};

export const initialInput = {
  id: crypto.randomUUID(),
  type: "basic",
  label: "Input 0",
  mode: "byte",
  text: "Hello world",
  encoding: "utf-8",
};

export function inputReducer(state, action) {
  switch (action.type) {
    case Actions.Add: {
      const prev = state.inputs;
      return {
        ...state,
        inputs: [
          ...prev,
          { ...initialInput, id: crypto.randomUUID(), label: action.label },
        ],
      };
    }
    case Actions.Remove: {
      const id = action.payload;
      const prev = state.inputs;
      return {
        ...state,
        inputs: prev.filter((input) => input.id !== id),
      };
    }
    case Actions.Update: {
      const prev = state.inputs;
      return {
        ...state,
        inputs: updateInputById(prev, action.id, action.partial),
      };
    }
    case Actions.Reorder: {
      const { oldIndex, newIndex } = action;
      const prev = state.inputs;
      return { ...state, inputs: arrayMove(prev, oldIndex, newIndex) };
    }
    case Actions.ChangeType: {
      const prev = state.inputs;
      return {
        ...state,
        inputs: prev.map((input) =>
          input.id === action.id
            ? {
                ...input,
                type: action.newType,
                ...getTypeExtensions(action.newType),
              }
            : input
        ),
      };
    }
    case Actions.ChangeMeta: {
      return { ...state, [action.field]: action.value };
    }
    case Actions.SetInputs: {
      return { ...state, ...action.payload };
    }
      case Actions.UpdateSchema:
  return state.map(input =>
    input.id === action.id
      ? { ...input, serializationSchema: action.schema }
      : input
  );

case Actions.UpdateEncoding:
  return state.map(input =>
    input.id === action.id
      ? { ...input, encoding: action.encoding }
      : input
  );

    default:
      return state;
  }
}
