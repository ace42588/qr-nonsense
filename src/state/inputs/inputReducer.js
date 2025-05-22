// src/state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";
import { createInput, getTypeDefaults } from "./inputFactory";
import { Actions } from "./inputActions";

const firstInput = createInput({ label: "Input 0" });

export const initialState = {
  meta: {
    errorCorrectionLevel: 0,
    version: -1,
    dataMask: -1,
  },
  inputs: [firstInput],
  activeInputID: firstInput.id,
};

function updateInputs(inputs, action) {
  const { id, partial, name, schema, encoding, newType, oldIndex, newIndex, label } = action.payload || {};
  switch (action.type) {
    case Actions.Add:
      return [...inputs, createInput({ label })];

    case Actions.Remove:
      return inputs.filter((input) => input.id !== id);

    case Actions.Update:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              ...partial,
              values: partial?.values
                ? { ...input.values, ...partial.values }
                : input.values,
              layout:
                partial?.layout !== undefined ? partial.layout : input.layout,
            }
          : input
      );

    case Actions.SetSchemaName:
      return inputs.map((input) =>
        input.id === id ? { ...input, schemaName: name } : input
      );

    case Actions.UpdateSchema:
      return inputs.map((input) =>
        input.id === id ? { ...input, schema } : input
      );

    case Actions.UpdateEncoding:
      return inputs.map((input) =>
        input.id === id ? { ...input, encoding } : input
      );

    case Actions.Reorder:
      return arrayMove(inputs, oldIndex, newIndex);

    case Actions.ChangeType:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              type: newType,
              ...getTypeDefaults(newType),
            }
          : input
      );

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
      return {
        ...state,
        inputs: updateInputs(state.inputs, action),
      };

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