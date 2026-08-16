/**
 * IS-QR generation orchestrator (browser BlendMask approximation).
 */

import { generateQArt, type QArtOptions, type QArtResult } from "../qart";
import { resizeImageDataNearest, type ImageData } from "../image";
import {
  computeInstanceMask,
  maskFromImageData,
  maskToModuleGrid,
  type InstanceMaskResult,
} from "./segmentation";
import { computeModuleBinaryTarget } from "./moduleBinary";
import { fuseColorQr } from "./fusion";
import { applyDwtCsf, type CsfOptions } from "./csf";
import {
  computeImageQualityMetrics,
  type ImageQualityMetrics,
} from "./metrics";

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

  // ROI on transformed (square) image
  let pixelMask: Float32Array;
  let roiMeta: InstanceMaskResult;

  if (maskImage) {
    const resized =
      maskImage.width === transformedImage.width &&
      maskImage.height === transformedImage.height
        ? maskImage
        : resizeImageDataNearest(
            maskImage,
            Math.max(transformedImage.width, transformedImage.height)
          );
    // If resize made square from non-square dims, ensure match
    const aligned =
      resized.width === transformedImage.width &&
      resized.height === transformedImage.height
        ? resized
        : resizeImageDataNearest(maskImage, transformedImage.width);
    pixelMask = maskFromImageData(aligned);
    roiMeta = {
      mask: pixelMask,
      saliency: pixelMask,
      labels: new Int32Array(pixelMask.length),
      instanceCount: 1,
      width: transformedImage.width,
      height: transformedImage.height,
    };
    for (let i = 0; i < pixelMask.length; i++) {
      roiMeta.labels[i] = pixelMask[i] > 0.5 ? 1 : 0;
    }
  } else {
    roiMeta = computeInstanceMask(transformedImage, roiThresholdBias);
    pixelMask = roiMeta.mask;
  }

  const roiGrid = maskToModuleGrid(
    pixelMask,
    transformedImage.width,
    transformedImage.height,
    dimension
  );

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

  // Prefer offscreen canvas image from QArt (QR-dimension based) for fusion source
  const sourceForFusion =
    qartResult.offscreenCanvasImage || transformedImage;

  // Align ROI grid sampling already at module level; fusion uses module ROI
  let fused = fuseColorQr(qartResult.matrix, sourceForFusion, {
    roiGrid,
    modulePixel,
    qrBlend,
  });

  fused = applyDwtCsf(fused, csf);

  // Metrics vs resized reference to fused size
  const reference = resizeImageDataNearest(transformedImage, fused.width);
  const metrics = computeImageQualityMetrics(reference, fused);

  return {
    qart: qartResult,
    roi: roiMeta,
    roiGrid,
    fusedImage: fused,
    metrics,
    instanceCount: roiMeta.instanceCount,
  };
}
