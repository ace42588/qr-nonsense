// src/state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";
import { createInput, updateInputById } from "./inputUtils";
import { getTypeExtensions } from "../../domain";
import { Actions } from "./inputActions";

export const initialInput = {
  id: crypto.randomUUID(),
  type: "basic",
  label: "Input 0",
  mode: "byte",
  text: "Hello world",
  encoding: "",
};

export const initialState = {
  meta: {
    errorCorrectionLevel: 0,
    version: -1,
    dataMask: -1,
  },
  inputs: [initialInput],
  activeInputID: initialInput.id,
};

function updateInputs(inputs, action) {
  const { id, partial, name, schema, encoding, newType, oldIndex, newIndex } = action.payload || {};
  switch (action.type) {
    case Actions.Add:
      return [...inputs, { ...initialInput, id: crypto.randomUUID(), label: action.payload.label }];
    case Actions.Remove:
      return inputs.filter((input) => input.id !== id);
    case Actions.Update:
      return updateInputById(inputs, id, partial);
    case Actions.SetSchemaName:
      return inputs.map((input) => input.id === id ? { ...input, schemaName: name } : input);
    case Actions.UpdateSchema:
      return inputs.map((input) => input.id === id ? { ...input, schema } : input);
    case Actions.UpdateEncoding:
      return inputs.map((input) => input.id === id ? { ...input, encoding } : input);
    case Actions.Reorder:
      return arrayMove(inputs, oldIndex, newIndex);
    case Actions.ChangeType:
      return inputs.map((input) => input.id === id ? { ...input, type: newType, ...getTypeExtensions(newType) } : input);
    default:
      return inputs;
  }
}

export function inputReducer(state, action) {
  switch (action.type) {
    case Actions.Add:
    case Actions.Remove:
    case Actions.Update:
    case Actions.SetSchemaName:
    case Actions.UpdateSchema:
    case Actions.UpdateEncoding:
    case Actions.Reorder:
    case Actions.ChangeType:
      return { ...state, inputs: updateInputs(state.inputs, action) };

    case Actions.ChangeMeta:
      return {
        ...state,
        meta: {
          ...state.meta,
          [action.payload.field]: action.payload.value,
        },
      };

    case Actions.SetInputs:
      return { ...state, ...action.payload };

    case Actions.SetActiveInput:
      return { ...state, activeInputID: action.payload.id };

    default:
      return state;
  }
}
