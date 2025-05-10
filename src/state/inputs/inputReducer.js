// state/inputs/inputReducer.js
import { arrayMove } from "@dnd-kit/sortable";
import { updateInputById } from "../utils";

export const Actions = {
  Add: "ADD",
  Remove: "REMOVE",
  Update: "UPDATE",
  Reorder: "REORDER",
};

export function inputReducer(inputs, action) {
  switch (action.type) {
    case Actions.Add: {
      return [
        ...inputs,
        {
          id: crypto.randomUUID(),
          type: "basic",
          label: "Input 0",
          mode: "byte",
          data: "Hello world",
          encoding: "utf-8",
        },
      ];
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
    default:
      return inputs;
  }
}

export const initialInputs = [
  {
    id: crypto.randomUUID(),
    type: "basic",
    label: "Input 0",
    mode: "byte",
    data: "Hello world",
    encoding: "utf-8",
  },
];

const basicExample = {
  id: crypto.randomUUID(),
  type: "basic",
  label: "Input 0",
  mode: "byte",
  text: "Hello world",
  encoding: "utf-8",
};

const bitFieldExample = {
  id: crypto.randomUUID(),
  type: "bitfield",
  label: "Input 0",
  fields: [],
  values: {},
  encoding: "dec",
};

const jsonExample = {
  id: crypto.randomUUID(),
  type: "json",
  label: "Input 0",
  obj: {},
  schema: {},
  encoding: "none",
};

const macExample = {
  id: crypto.randomUUID(),
  type: "mac",
  label: "Input 0",
  algo: "HMAC-SHA256",
  key: "supersecret",
  selectedInputs: [],
};
