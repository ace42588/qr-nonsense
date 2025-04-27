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
  matrix: null,
};

function getModulesToHighlight(segment) {}

function highlightModules(segment, matrix) {
  const modulesToUpdate = getModulesToHighlight(segment);
  const newMatrix = matrix.map((row) =>
    row.map((module) => {
      let { bit, isHighlighted } = module;
      const newModule = { ...module };
      if (bit.id && modulesToUpdate.some(({ id }) => id === bit.id)) {
        newModule.isHighlighted = !isHighlighted;
      }
      return newModule;
    })
  );
  return newMatrix;
}

function getSegmentToHighlight(module) {}

function highlightSegment(module, segments) {
  const { bit, nonData } = module;

  const segmentToUpdate = getSegmentToHighlight(module);
  if (!segmentToUpdate) return;
  const newSegments = segments.map((segment) => {
    let { id, isHighlighted } = segment;
    const newSegment = { ...segment };
    if (id === segmentToUpdate.id) newSegment.isHighlighted = !isHighlighted;
    return newSegment;
  });
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
        const { segment } = action.payload;
        if (action.payload.type === "module") {
          const { bit, nonData } = action.payload;
          return {
            ...state,
            matrix: highlightModules(segment, state.matrix),
          };
        } else {
          const segmentToUpdate = getSegmentToHighlight();
          const newSegments = state.segments.map((segment) => {
          let { id, isHighlighted } = segment;
          const newSegment = { ...segment };
          if (id === segmentToUpdate.id)
            newSegment.isHighlighted = !isHighlighted;
          return newSegment;
        });
        return {
          ...state,
          segments: newSegments,
        };
        }
      } catch (e) {
        console.error(e);
      }
      return state;
    }
    case Actions.HighlightSegment: {
      try {
        const { module } = action;
        const { bit, nonData } = module;
        if (nonData) {
          const {
            source: { name },
          } = module;
          const newMatrix = state.matrix.map((row) =>
            row.map((module) => {
              const newModule = { ...module };
              if (module.source && module.source.name === name)
                newModule.isHighlighted = !module.isHighlighted;
              return newModule;
            })
          );
          return { ...state, matrix: highlightModules() };
        }
        const segmentToUpdate = state.bitMap.get(bit);
        if (!segmentToUpdate) return state;
        const newSegments = state.segments.map((segment) => {
          let { id, isHighlighted } = segment;
          const newSegment = { ...segment };
          if (id === segmentToUpdate.id)
            newSegment.isHighlighted = !isHighlighted;
          return newSegment;
        });
        return {
          ...state,
          segments: newSegments,
        };
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
