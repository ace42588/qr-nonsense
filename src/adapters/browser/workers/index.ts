/**
 * Browser worker pool + off-thread pipeline. Import from the app entry
 * so the pipeline runner is installed on the main thread only.
 */

import { setPipelineRunner } from "@/domain/pipeline/runner";
import { runGraphOffthread } from "./runGraphOffthread";

export function installBrowserPipelineRunner(): void {
  setPipelineRunner(runGraphOffthread);
}

export { getWorkerPool, WorkerPool, clampWorkerCount, canUseWorkers, JobCancelledError, setWorkerPoolForTests } from "./pool";
export { LatestWinsScheduler, ScanFrameGate } from "./latestWins";
export { serializeMatrixForWorker } from "./serialize";
export { runGraphOffthread } from "./runGraphOffthread";
export {
  transformImageOffthread,
  computeImportanceMapOffthread,
  decodeScanFrameOffthread,
  findCharacterChangeOffthread,
} from "./jobs";
