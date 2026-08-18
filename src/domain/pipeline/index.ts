export type {
  PortType,
  PipelineStage,
  RenderIntent,
  GenerationContext,
  NodeParams,
  PipelineNode,
  PresetGraph,
  PresetId,
} from "./types";

export {
  createGenerationContext,
  cloneContext,
  attachMatrixLookup,
  withMatrix,
  withBlocks,
  contextHasPort,
  missingPorts,
} from "./context";

export {
  NODE_CATALOG,
  getNode,
  listNodeIds,
  applyNodeParams,
} from "./catalog";

export {
  PRESETS,
  QART_FROM_MATRIX_NODES,
  getPreset,
  resolvePresetNodes,
  listPresetIds,
} from "./presets";

export {
  runGraph,
  validateNodePorts,
  validateNodeSequence,
  PipelineError,
} from "./run";

export type {
  ConstraintStrength,
  ConstraintSource,
  ModuleConstraint,
  ConstraintSet,
  ConstraintGrids,
  ConstraintsFromMatrixOptions,
} from "@/domain/constraints";

export {
  constraintsFromImageGrids,
  constraintsFromMatrix,
  constraintsToGrids,
  mergeConstraintItems,
} from "@/domain/constraints";

// Context slice types for the qartSelectEditable/qartBitPriority/qartSolve
// split (referenced by GenerationContext.editableSelection / .bitOrders).
export type { QArtEditableSelection } from "@/domain/qart/stages";
export type { BitPosition } from "@/domain/qart/bitPriority";

export {
  contextFromQArtOptions,
  qartResultFromContext,
  generateQArtViaPipeline,
  contextFromDualOptions,
  ambiguousResultFromContext,
  embedResultFromContext,
  generateAmbiguousViaPipeline,
  generateEmbedViaPipeline,
  contextFromIsqrOptions,
  isqrResultFromContext,
} from "./adapters";

export type { EvaluationReport } from "@/domain/evaluate";
