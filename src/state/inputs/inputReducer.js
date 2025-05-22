// src/state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";
import { createInput, getTypeDefaults } from "./inputFactory";
import { Actions } from "./inputActions";

const firstInput = createInput({ label: "Input 0" });

export const initialState = {
  formatInfo: {
    errorCorrectionLevel: 0,
    version: -1,
    dataMask: -1,
  },
  inputs: [firstInput],
  activeInputID: firstInput.id,
};

function updateInputs(inputs, action) {
  const {
    id,
    partial,
    name,
    schema,
    encoding,
    newType,
    oldIndex,
    newIndex,
    label,
    newField,
    fieldId,
    updatedValues,
    obj,
    key,
    algo,
    includedFields,
  } = action.payload || {};

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

    case Actions.AddBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: [...(input.fields || []), newField],
            }
          : input
      );

    case Actions.RemoveBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: input.fields.filter((f) => f.id !== fieldId),
            }
          : input
      );

    case Actions.UpdateBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: input.fields.map((f) =>
                f.id === fieldId ? { ...f, ...partial } : f
              ),
            }
          : input
      );

    case Actions.ReorderBitFieldFields:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: arrayMove(input.fields, oldIndex, newIndex),
            }
          : input
      );

    case Actions.SetBitFieldValues:
      return inputs.map((input) =>
        input.id === id ? { ...input, values: updatedValues } : input
      );

    case Actions.UpdateJsonObject:
      return inputs.map((input) =>
        input.id === id ? { ...input, obj } : input
      );

    case Actions.SetMacKey:
      return inputs.map((input) =>
        input.id === id ? { ...input, key } : input
      );

    case Actions.SetMacAlgorithm:
      return inputs.map((input) =>
        input.id === id ? { ...input, algo } : input
      );

    case Actions.SetIncludedFields:
      return inputs.map((input) =>
        input.id === id ? { ...input, includedFields } : input
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
    case Actions.AddBitFieldField:
    case Actions.RemoveBitFieldField:
    case Actions.UpdateBitFieldField:
    case Actions.ReorderBitFieldFields:
    case Actions.SetBitFieldValues:
    case Actions.UpdateJsonObject:
    case Actions.SetMacKey:
    case Actions.SetMacAlgorithm:
    case Actions.SetIncludedFields:
      return {
        ...state,
        inputs: updateInputs(state.inputs, action),
      };

    case Actions.ChangeformatInfo:
      return {
        ...state,
        formatInfo: {
          ...state.formatInfo,
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