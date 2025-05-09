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
          fields: [],
          values: {},
          algo: "HMAC-SHA256",
          key: "supersecret",
          mac: "",
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
    type: "basic",
    label: "Input 0",
    data: {
      mode: "byte",
      data: "Hello world",
      encoding: "utf-8",
    },
    fields: [],
    values: {},
    algo: "HMAC-SHA256",
    key: "supersecret",
  },
];

const basicExample = {
  id: crypto.randomUUID(),
  type: "basic",
  label: "Input 0",
  data: {
    mode: "byte",
    data: "Hello world",
    encoding: "utf-8",
  },
};

const bitFieldExample = {
  id: crypto.randomUUID(),
  type: "bitfield",
  label: "Input 0",
  data: {
    fields: [],
    values: {},
    encoding: "dec",
  },
};

const jsonExample = {
  id: crypto.randomUUID(),
  type: "json",
  label: "Input 0",
  data: { 
    obj: {}, 
    schema: {}, 
    encoding: "none",
  },
};

const macExample = {
  id: crypto.randomUUID(),
  type: "mac",
  label: "Input 0",
  data: {
    algo: "HMAC-SHA256",
    key: "supersecret",
    selectedInputs: [],
  },
};
