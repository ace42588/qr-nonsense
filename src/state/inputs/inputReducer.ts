import { arrayMove } from "@dnd-kit/sortable";
import { createInput, getInputTypeDefaults, DEFAULT_FIELD, InputTypeDefaults } from "./inputFactory";
import { Actions } from "./inputActions";
import { ActivePayload, Input, InputAction, InputState } from "./types";
import { generateId } from "@/domain/qr/utils/id";

const firstInput = createInput({ label: "Input 0" });
const firstInputB = createInput({
  label: "Input 0",
  text: "Payload B",
  data: "Payload B",
});

export const initialState: InputState = {
  formatInfo: {
    errorCorrectionLevel: 0,
    version: -1,
    dataMask: -1,
  },
  inputs: [firstInput],
  activeInputID: firstInput.id,
  inputsB: [firstInputB],
  activeInputIDB: firstInputB.id,
  activePayload: "a",
};

const LIST_MUTATION_ACTIONS = new Set<Actions>([
  Actions.Add,
  Actions.Remove,
  Actions.Update,
  Actions.SetSchemaName,
  Actions.UpdateSchema,
  Actions.UpdateEncoding,
  Actions.Reorder,
  Actions.SetInputType,
  Actions.AddBitFieldField,
  Actions.RemoveBitFieldField,
  Actions.UpdateBitFieldField,
  Actions.ReorderBitFieldFields,
  Actions.SetBitFieldValues,
  Actions.UpdateJsonObject,
  Actions.SetMacKey,
  Actions.SetMacAlgorithm,
  Actions.SetIncludedFields,
]);

function listKeys(payload: ActivePayload): {
  inputsKey: "inputs" | "inputsB";
  activeKey: "activeInputID" | "activeInputIDB";
} {
  return payload === "b"
    ? { inputsKey: "inputsB", activeKey: "activeInputIDB" }
    : { inputsKey: "inputs", activeKey: "activeInputID" };
}

function updateInputs(inputs: Input[], action: InputAction): Input[] {
  const {
    id,
    partial,
    name,
    schema,
    encoding,
    newType: newInputType,
    oldIndex,
    newIndex,
    label,
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
      return arrayMove(inputs, oldIndex!, newIndex!);

    case Actions.SetInputType:
      return inputs.map((input) => {
        if (input.id !== id) return input;
        if (typeof newInputType !== 'string' || !['string', 'json', 'bitfield', 'mac', 'template', 'structuredAppend', 'fnc1'].includes(newInputType)) {
          return input;
        }
        const defaults = getInputTypeDefaults(newInputType as keyof InputTypeDefaults);
        const textDefault = (defaults as { text?: string }).text;
        const next: Input = {
          ...input,
          ...defaults,
          type: newInputType,
        };
        if (typeof textDefault === "string") {
          next.text = textDefault;
          next.data = textDefault;
        } else if (newInputType === "structuredAppend") {
          next.text = "";
          next.data = "";
        }
        return next;
      });

    case Actions.AddBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: [
                ...(input.fields || []),
                {
                  ...DEFAULT_FIELD,
                  label,
                  id: generateId(),
                },
              ],
            }
          : input
      );

    case Actions.RemoveBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: input.fields!.filter((f) => f.id !== fieldId),
            }
          : input
      );

    case Actions.UpdateBitFieldField:
      return inputs.map((input) =>
        input.id === id
          ? {
              ...input,
              fields: input.fields!.map((f) =>
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
              fields: arrayMove(input.fields!, oldIndex!, newIndex!),
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

export function inputReducer(state: InputState, action: InputAction): InputState {
  if (LIST_MUTATION_ACTIONS.has(action.type)) {
    const { inputsKey, activeKey } = listKeys(state.activePayload);
    const nextList = updateInputs(state[inputsKey], action);
    const nextState: InputState = {
      ...state,
      [inputsKey]: nextList,
    };

    if (action.type === Actions.Remove && action.payload?.id === state[activeKey]) {
      nextState[activeKey] = nextList[0]?.id ?? null;
    }

    return nextState;
  }

  switch (action.type) {
    case Actions.SetErrorCorrectionLevel:
    case Actions.SetVersion:
    case Actions.SetDataMask:
      return {
        ...state,
        formatInfo: {
          ...state.formatInfo,
          [action.payload!.field!]: action.payload!.value,
        },
      };

    case Actions.SetInputs:
      return { ...state, ...action.payload };

    case Actions.SetActiveInput: {
      const { activeKey } = listKeys(state.activePayload);
      return { ...state, [activeKey]: action.payload!.id! };
    }

    case Actions.SetActivePayload: {
      const next = action.payload?.activePayload;
      if (next !== "a" && next !== "b") return state;
      return { ...state, activePayload: next };
    }

    default:
      return state;
  }
}
