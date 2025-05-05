import { deriveFromInputs } from "./deriveFromInputs";
import { deriveInputsFromMatrix } from "./deriveFromMatrix";

export const Actions = {
  ChangeInputs: "UPDATE_INPUTS",
  ChangeDataMask: "UPDATE_DATAMASK",
  ChangeVersion: "UPDATE_VERSION",
  ChangeErrorCorretionLevel: "UPDATE_ECL",
  Highlight: "HIGHLIGHT",
  ClearSegmentHighlight: "RESET_SEGMENT_HIGHLIGHT",
  HighlightModules: "HIGHLIGHT",
  ClearSegmentHighlight: "RESET_MODULE_HIGHLIGHT",
  ToggleModule: "TOGGLE_MODULE"
};

export const initialData = {
  errorCorrectionLevel: 0,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  segments: [],
  codewords: [],
  matrix: [[]],
  source: "inputs",
  error: ""
};

function getModulesToHighlight(segment, state) {
  const { id } = segment;
  const { idMap } = state;
  return idMap.get(id);
}

function highlightModules(segment, state) {
  const modulesToUpdate = getModulesToHighlight(segment, state);
  const newMatrix = state.matrix.map((row) =>
    row.map((module) => {
      let { bit, isHighlighted } = module;
      const newModule = { ...module };
      if (bit.id && modulesToUpdate.some((id) => id === bit.id)) {
        newModule.isHighlighted = !isHighlighted;
      }
      return newModule;
    })
  );
  return newMatrix;
}

function getSegmentToHighlight(module, state) {
  const {
    bit: { id },
  } = module;
  const { idMap } = state;
  return idMap.get(id);
}

function highlightSegment(module, state) {
  const segmentToUpdate = getSegmentToHighlight(module, state);
  //console.debug("highlightSegment", {segmentToUpdate});
  const newSegments = state.segments.map((segment) => {
    let { id, isHighlighted } = segment;
    const newSegment = { ...segment };
    if (id === segmentToUpdate) newSegment.isHighlighted = !isHighlighted;
    return newSegment;
  });
  return newSegments;
}

export function dataReducer(state, action) {
  //console.debug("dataReducer", {action})
  switch (action.type) {
    case Actions.ChangeInputs: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeDataMask: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeVersion: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.ChangeErrorCorretionLevel: {
      return deriveFromInputs(state, action.payload);
    }
    case Actions.Highlight: {
      try {
        if (action.payload.type === "module") {
          // we got a module, highlight segments
          const module = action.payload;
          // highlight the other nondata modules
          if (module.nonData) {
            const {
              source: { name },
            } = module;
            const newMatrix = state.matrix.map((row) =>
              row.map((m) => {
                const newModule = { ...m };
                if (m.source && m.source.name === name)
                  newModule.isHighlighted = !m.isHighlighted;
                return newModule;
              })
            );
            return { ...state, matrix: newMatrix };
          }
          return {
            ...state,
            segments: highlightSegment(module, state),
          };
        } else {
          // we got a segment part, highlight modules
          const segment = action.payload;
          return {
            ...state,
            matrix: highlightModules(segment, state),
          };
        }
      } catch (e) {
        console.error(e);
      }
      return state;
    }
    default: {
      return state;
    }
  }
}
