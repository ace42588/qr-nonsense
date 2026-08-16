export {
  findMinimalCharacterChangeFlips,
  enumerateCharacterChangeCandidates,
  differingBitIndices,
  selectFlipsAbusingEc,
} from "./characterChange";
export type {
  CharacterChangeSolution,
  CharacterChangeSolverOptions,
  BlockFlipReport,
} from "./characterChange";

export {
  findBruteForceCollision,
  combinationsCount,
  nextCombination,
  unrankCombination,
  trialBudgetForWorker,
  shardRankCount,
  exhaustiveSearchSpaceSize,
  trialsToExhaustSearchSpace,
} from "./bruteForceCollision";
export type {
  BruteForceCollisionOptions,
  BruteForceCollisionResult,
  BruteForceCollisionProgress,
  CollisionDecodeFn,
  CollisionSearchPhase,
} from "./bruteForceCollision";

export {
  classifyRsPrefilter,
  shouldRunJsQrAfterRsPrefilter,
  serializeRsBlocks,
} from "./rsPrefilter";
export type {
  SerializedRsBlock,
  RsPrefilterOutcome,
} from "./rsPrefilter";

export { findTargetedCollision } from "./targetedCollision";
export type { TargetedCollisionOptions } from "./targetedCollision";
