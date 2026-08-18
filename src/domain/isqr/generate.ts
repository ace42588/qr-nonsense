/**
 * IS-QR generation orchestrator — ROI + off-thread QArt + color fusion + DWT/CSF.
 */

import { generateQArt, type QArtOptions, type QArtResult } from "../qart";
import type { ImageData } from "../image";
import type { InstanceMaskResult } from "./segmentation";
import type { CsfOptions } from "./csf";
import type { ImageQualityMetrics } from "./metrics";
import {
  computeRoi,
  computeModuleBinaryTarget,
  fuseIsqrColor,
  applyIsqrDwtCsf,
  computeIsqrMetrics,
} from "./stages";

export interface IsqrOptions {
  qart: QArtOptions;
  /** Transformed image at display/reference size (for ROI + metrics) */
  transformedImage: ImageData;
  /** Optional uploaded mask ImageData (same aspect; will be nearest-resized) */
  maskImage?: ImageData | null;
  /** Bias added to Otsu saliency threshold (−0.2…0.2) */
  roiThresholdBias?: number;
  /** Module pixels for fused render */
  modulePixel?: number;
  /** CSF / DWT options */
  csf?: CsfOptions;
  /** QR luminance blend outside ROI */
  qrBlend?: number;
}

export interface IsqrResult {
  qart: QArtResult;
  roi: InstanceMaskResult;
  roiGrid: Float32Array;
  fusedImage: ImageData;
  metrics: ImageQualityMetrics;
  instanceCount: number;
}

/**
 * Run full IS-QR pipeline: ROI → module binary → ROI-aware QArt → color fusion → DWT/CSF → metrics.
 * QArt optimization runs through the shared worker pool; fusion/metrics stay on this side
 * of the ImageData so display size and fused size cannot drift apart.
 */
export async function generateIsqr(options: IsqrOptions): Promise<IsqrResult> {
  const {
    qart,
    transformedImage,
    maskImage,
    roiThresholdBias = 0,
    modulePixel = 3,
    csf = {},
    qrBlend = 0.55,
  } = options;

  if (qart.signal?.aborted) {
    throw new Error("IS-QR generation was cancelled");
  }

  const version = qart.versionInfo.version;
  const dimension = version * 4 + 17;

  const { roiMeta, roiGrid } = computeRoi({
    transformedImage,
    dimension,
    maskImage,
    roiThresholdBias,
  });

  const binaryTarget = computeModuleBinaryTarget(transformedImage, dimension);

  const qartResult = await generateQArt({
    ...qart,
    priorityFunction: "roi",
    roiGrid,
    targetGridOverride: binaryTarget,
  });

  if (qart.signal?.aborted) {
    throw new Error("IS-QR generation was cancelled");
  }

  const offscreen = qartResult.offscreenCanvasImage;
  const sourceForFusion =
    offscreen &&
    offscreen.width > 0 &&
    offscreen.height > 0 &&
    offscreen.data?.length > 0
      ? offscreen
      : transformedImage;

  let fused = fuseIsqrColor({
    matrix: qartResult.matrix,
    sourceImage: sourceForFusion,
    roiGrid,
    modulePixel,
    qrBlend,
  });

  fused = applyIsqrDwtCsf(fused, csf);

  const metrics = computeIsqrMetrics(transformedImage, fused);

  return {
    qart: qartResult,
    roi: roiMeta,
    roiGrid,
    fusedImage: fused,
    metrics,
    instanceCount: roiMeta.instanceCount,
  };
}
