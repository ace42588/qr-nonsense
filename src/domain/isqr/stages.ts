/**
 * IS-QR stage helpers for the generation pipeline.
 */

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

export interface ComputeRoiResult {
  roiMeta: InstanceMaskResult;
  roiGrid: Float32Array;
  pixelMask: Float32Array;
}

export function computeRoi(options: {
  transformedImage: ImageData;
  dimension: number;
  maskImage?: ImageData | null;
  roiThresholdBias?: number;
}): ComputeRoiResult {
  const {
    transformedImage,
    dimension,
    maskImage,
    roiThresholdBias = 0,
  } = options;

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

  return { roiMeta, roiGrid, pixelMask };
}

export { computeModuleBinaryTarget };

export function fuseIsqrColor(options: {
  matrix: import("../shared/types").QRMatrix;
  sourceImage: ImageData;
  roiGrid: Float32Array;
  modulePixel?: number;
  qrBlend?: number;
}): ImageData {
  return fuseColorQr(options.matrix, options.sourceImage, {
    roiGrid: options.roiGrid,
    modulePixel: options.modulePixel,
    qrBlend: options.qrBlend,
  });
}

export function applyIsqrDwtCsf(
  fused: ImageData,
  csf?: CsfOptions
): ImageData {
  return applyDwtCsf(fused, csf ?? {});
}

export function computeIsqrMetrics(
  referenceImage: ImageData,
  fused: ImageData
): ImageQualityMetrics {
  const reference = resizeImageDataNearest(referenceImage, fused.width);
  return computeImageQualityMetrics(reference, fused);
}
