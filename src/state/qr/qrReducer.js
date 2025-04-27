import { Actions } from "./Constants";
import { deriveFromInputs } from "./deriveFromInputs";
import { deriveInputsFromMatrix } from "./deriveFromMatrix";

export const initialData = {
  encodedInputs: [],
  errorCorrectionLevel: 0,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  segments: [],
  codewords: [],
  matrix: [[]],
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
  switch (action.type) {
    case Actions.ChangeInput: {
      return deriveFromInputs(state, { inputs: action.inputs });
    }
    case Actions.ChangeDataMask: {
      return deriveFromInputs(state, { dataMask: action.dataMask });
    }
    case Actions.ChangeVersion: {
      return deriveFromInputs(state, { version: action.version });
    }
    case Actions.ChangeErrorCorretionLevel: {
      return deriveFromInputs(state, {
        errorCorrectionLevel: action.errorCorrectionLevel,
      });
    }
    case Actions.HighlightModules: {
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
