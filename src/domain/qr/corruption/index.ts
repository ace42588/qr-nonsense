export {
  getModuleKey,
  collectByPattern,
  collectFinderCorner,
  indexMatrix,
  eligibleCollisionModules,
  eligibleFormatMetaModules,
  eligibleDataEcModules,
  eligibleTieredDataModules,
  buildSegmentTypesBySourceId,
  COLLISION_EXCLUDED_PATTERNS,
  type FinderCorner,
  type EligibleTierModules,
} from "./moduleIndex";

export {
  applyVisualDamage,
  damagedIdsToDataBitIds,
  countDamageByKind,
} from "./applyDamage";

export {
  selectConstraintDamage,
  DEFAULT_SAFETY_MARGIN,
  type ConstraintDamageOptions,
} from "./constraintDamage";

export {
  damageFinderCorner,
  corruptFormatInfo,
  damageTiming,
  damageAlignment,
  randomModules,
  type RandomFilter,
} from "./presets";
