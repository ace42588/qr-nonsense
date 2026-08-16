import { encodePair, type EncodePairOptions, type EncodePairResult } from "@/domain/dual";
import {
  fuseEmbedPairWithCsf,
  type EmbedFusionOptions,
} from "./fusion";

export type EmbedOptions = EncodePairOptions & EmbedFusionOptions;

export interface EmbedResult extends EncodePairResult {
  fusedImage: ImageData | null;
  modulePixel: number;
  centerSeed: number;
}

export function generateEmbed(options: EmbedOptions): EmbedResult {
  const {
    modulePixel = 9,
    centerSeed = 0.35,
    polarityStrength = 0.9,
    csf = { strength: 0.5 },
    ...pairOpts
  } = options;

  const pair = encodePair(pairOpts);
  const mp = Math.max(3, modulePixel);
  const seed = Math.max(0.15, Math.min(1, centerSeed));

  if (!pair.matrixA?.length || !pair.matrixB?.length) {
    return {
      ...pair,
      fusedImage: null,
      modulePixel: mp,
      centerSeed: seed,
    };
  }

  const fusedImage = fuseEmbedPairWithCsf(pair.matrixA, pair.matrixB, {
    modulePixel: mp,
    centerSeed: seed,
    polarityStrength,
    csf,
  });

  return {
    ...pair,
    fusedImage,
    modulePixel: mp,
    centerSeed: seed,
  };
}

export { buildEmbedPattern } from "./pattern";
export { renderEmbedModule } from "./render";
export {
  fuseEmbedPair,
  fuseEmbedPairWithCsf,
  type EmbedFusionOptions,
} from "./fusion";
