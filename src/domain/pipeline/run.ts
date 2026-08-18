/**
 * Linear generation pipeline runner.
 */

import { getNode } from "./catalog";
import { cloneContext, missingPorts } from "./context";
import { getPreset, resolvePresetNodes } from "./presets";
import type {
  GenerationContext,
  NodeParams,
  PortType,
  PresetId,
} from "./types";

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineError";
  }
}

function assertNotAborted(ctx: GenerationContext): void {
  if (ctx.signal?.aborted) {
    throw new PipelineError("Pipeline run was cancelled");
  }
}

/**
 * Validate that required input ports are present before running a node.
 */
export function validateNodePorts(
  nodeId: string,
  ctx: GenerationContext
): void {
  const node = getNode(nodeId);
  if (!node) {
    throw new PipelineError(`Unknown pipeline node: ${nodeId}`);
  }
  const missing = missingPorts(ctx, node.in);
  if (missing.length > 0) {
    throw new PipelineError(
      `Node "${nodeId}" missing required ports: ${missing.join(", ")}`
    );
  }
}

function markPortsSatisfied(
  ctx: GenerationContext,
  ports: PortType[]
): GenerationContext {
  const next = { ...ctx };
  for (const port of ports) {
    switch (port) {
      case "Inputs":
        next.inputs = next.inputs ?? [];
        break;
      case "InputsB":
        next.inputsB = next.inputsB ?? [];
        break;
      case "Format":
        next.errorCorrectionLevel = next.errorCorrectionLevel ?? 0;
        next.version = next.version ?? 1;
        break;
      case "Segments":
        next.segments = next.segments ?? [];
        break;
      case "Codewords":
        next.codewords = next.codewords ?? [];
        break;
      case "Blocks":
        next.blocks = next.blocks ?? [];
        break;
      case "Matrix":
        next.matrix =
          next.matrix ?? ([] as unknown as GenerationContext["matrix"]);
        break;
      case "MatrixA":
        next.matrixA =
          next.matrixA ?? ([] as unknown as GenerationContext["matrixA"]);
        break;
      case "MatrixB":
        next.matrixB =
          next.matrixB ?? ([] as unknown as GenerationContext["matrixB"]);
        break;
      case "Image":
        next.targetImage =
          next.targetImage ??
          ({
            width: 1,
            height: 1,
            data: new Uint8ClampedArray(4),
          } as ImageData);
        break;
      case "Grid":
        next.targetGrid = next.targetGrid ?? new Float32Array(1);
        break;
      case "Constraints":
        next.constraints =
          next.constraints ?? {
            dimension: 1,
            valueGrid: new Float32Array(1),
            weightGrid: new Float32Array(1),
          };
        break;
      case "EditableSelection":
        next.editableSelection =
          next.editableSelection ?? {
            editableSegmentIds: new Set<string>(),
            appendSegmentIds: new Set<string>(),
            editableCodewordIndices: [],
            excludeLastSegmentBits: new Set<string>(),
          };
        break;
      case "BitOrders":
        next.bitOrders = next.bitOrders ?? [];
        break;
      case "Damage":
        next.damagedModuleIds = next.damagedModuleIds ?? [];
        break;
      case "Render":
        next.renderIntent = next.renderIntent ?? "modules";
        break;
      case "Report":
        next.evaluation =
          next.evaluation ??
          ({
            identity: {
              version: next.version ?? 1,
              errorCorrectionLevel: next.errorCorrectionLevel ?? 0,
              dataMask:
                typeof next.dataMask === "number" ? next.dataMask : null,
              dimension: 21,
              moduleCount: 441,
            },
            metrics: [],
          } as GenerationContext["evaluation"]);
        break;
    }
  }
  return next;
}

/**
 * Validate an ordered list of nodes against cumulative port production.
 * Illegal sequences (e.g. halftone before matrix) fail before any run.
 */
export function validateNodeSequence(
  nodeIds: string[],
  initialCtx: GenerationContext = {}
): void {
  let synth: GenerationContext = { ...initialCtx };

  for (const id of nodeIds) {
    const node = getNode(id);
    if (!node) {
      throw new PipelineError(`Unknown pipeline node: ${id}`);
    }
    if (node.optional) {
      const missing = missingPorts(synth, node.in);
      if (missing.length > 0) continue;
    } else {
      validateNodePorts(id, synth);
    }
    synth = markPortsSatisfied(synth, node.out);
  }
}

export interface RunGraphOptions {
  params?: NodeParams;
  /** Skip port validation (not recommended). */
  skipValidation?: boolean;
}

/**
 * Run a preset by id or an explicit ordered node list.
 * Optional nodes are skipped when required ports are missing.
 */
export async function runGraph(
  presetOrNodes: PresetId | string[],
  ctx: GenerationContext,
  options: RunGraphOptions = {}
): Promise<GenerationContext> {
  const nodeIds = Array.isArray(presetOrNodes)
    ? presetOrNodes
    : resolvePresetNodes(presetOrNodes);

  if (!Array.isArray(presetOrNodes)) {
    const preset = getPreset(presetOrNodes);
    if (!preset) {
      throw new PipelineError(`Unknown preset: ${presetOrNodes}`);
    }
  }

  if (!options.skipValidation) {
    validateNodeSequence(nodeIds, ctx);
  }

  let current = cloneContext(ctx);
  const params = options.params ?? {};

  for (const id of nodeIds) {
    assertNotAborted(current);
    const node = getNode(id);
    if (!node) {
      throw new PipelineError(`Unknown pipeline node: ${id}`);
    }

    if (node.optional) {
      const missing = missingPorts(current, node.in);
      if (missing.length > 0) continue;
    } else {
      validateNodePorts(id, current);
    }

    current = await node.run(current, params);
  }

  return current;
}
