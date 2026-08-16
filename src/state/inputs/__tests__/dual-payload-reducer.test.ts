import { describe, it, expect } from "vitest";
import { inputReducer, initialState } from "@/state/inputs/inputReducer";
import {
  addInput,
  setActivePayload,
  setActiveInput,
  updateInput,
  setInputs,
} from "@/state/inputs/inputActions";

describe("dual payload input reducer", () => {
  it("defaults to payload A and has a B list", () => {
    expect(initialState.activePayload).toBe("a");
    expect(initialState.inputsB.length).toBeGreaterThan(0);
    expect(initialState.activeInputIDB).toBeTruthy();
  });

  it("routes list mutations to active payload B", () => {
    let state = inputReducer(initialState, setActivePayload("b"));
    expect(state.activePayload).toBe("b");
    const beforeA = state.inputs.length;
    const beforeB = state.inputsB.length;
    state = inputReducer(state, addInput("B Extra"));
    expect(state.inputs.length).toBe(beforeA);
    expect(state.inputsB.length).toBe(beforeB + 1);
  });

  it("setActiveInput targets the active payload list", () => {
    let state = inputReducer(initialState, setActivePayload("b"));
    state = inputReducer(state, addInput("Second B"));
    const secondId = state.inputsB[1].id;
    state = inputReducer(state, setActiveInput(secondId));
    expect(state.activeInputIDB).toBe(secondId);
    expect(state.activeInputID).toBe(initialState.activeInputID);
  });

  it("updates only the active payload input", () => {
    let state = inputReducer(initialState, setActivePayload("a"));
    const aId = state.activeInputID!;
    state = inputReducer(
      state,
      updateInput(aId, { text: "payload-a", data: "payload-a" })
    );
    expect(state.inputs.find((i) => i.id === aId)?.text).toBe("payload-a");
    expect(state.inputsB[0].text).not.toBe("payload-a");
  });

  it("setInputs can replace Payload B list without touching A", () => {
    const replacement = {
      ...initialState.inputsB[0],
      id: "b-opt-1",
      text: "OPTIMIZED",
      data: "OPTIMIZED",
      mode: "alphanumeric",
    };
    const state = inputReducer(
      initialState,
      setInputs({
        inputsB: [replacement],
        activeInputIDB: replacement.id,
      })
    );
    expect(state.inputs).toEqual(initialState.inputs);
    expect(state.inputsB).toHaveLength(1);
    expect(state.inputsB[0].text).toBe("OPTIMIZED");
    expect(state.activeInputIDB).toBe("b-opt-1");
  });
});
