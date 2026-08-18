/**
 * Optional pipeline runner injection (browser installs the worker scheduler).
 * Domain tests keep the in-process runGraph default.
 */

import { runGraph } from "./run";
import type { GenerationContext, PresetId } from "./types";
import type { RunGraphOptions } from "./run";

export type PipelineRunner = (
  presetOrNodes: PresetId | string[],
  ctx: GenerationContext,
  options?: RunGraphOptions
) => Promise<GenerationContext>;

let runner: PipelineRunner = runGraph;

export function setPipelineRunner(next: PipelineRunner | null): void {
  runner = next ?? runGraph;
}

export function runPipeline(
  presetOrNodes: PresetId | string[],
  ctx: GenerationContext,
  options?: RunGraphOptions
): Promise<GenerationContext> {
  return runner(presetOrNodes, ctx, options);
}
