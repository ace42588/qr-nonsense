import { Actions } from "../../domain/qr/Constants";
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
      const { segment } = action;
      const modulesToUpdate = state.segmentMap.get(segment.id);
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
      return {
        ...state,
        matrix: newMatrix,
      };
    }
    case Actions.HighlightSegment: {
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
        return { ...state, matrix: newMatrix };
      }
      const segmentToUpdate = state.bitMap.get(bit.id);
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
    }
    default: {
      return state;
    }
  }
}
