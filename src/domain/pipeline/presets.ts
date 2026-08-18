/**
 * Mode preset graphs — ordered node ids matching App qrType values.
 */

import type { PresetGraph, PresetId } from "./types";

const QR_CORE = ["parseInputs", "encode", "codewords", "matrix"] as const;

const QART_TAIL = [
  "qartAppend",
  "rasterize",
  "qartOptimize",
  "qartRebuild",
  "evaluate",
] as const;

export const PRESETS: Record<PresetId, PresetGraph> = {
  qr: {
    id: "qr",
    label: "Standard QR",
    nodes: [...QR_CORE, "evaluate"],
  },
  hqr: {
    id: "hqr",
    label: "Halftone QR",
    nodes: [...QR_CORE, "rasterize", "halftone", "evaluate"],
  },
  qart: {
    id: "qart",
    label: "QArt",
    nodes: [...QR_CORE, ...QART_TAIL],
  },
  combined: {
    id: "combined",
    label: "Combined QArt + Halftone",
    nodes: [...QR_CORE, ...QART_TAIL, "halftone"],
  },
  isqr: {
    id: "isqr",
    label: "IS-QR",
    nodes: [
      ...QR_CORE,
      "isqrRoi",
      "rasterize",
      "qartOptimize",
      "qartRebuild",
      "isqrFuse",
      "dwtCsf",
      "evaluate",
    ],
  },
  ambiguous: {
    id: "ambiguous",
    label: "Ambiguous dual-payload",
    nodes: ["encodePair", "ambiguousRender", "evaluate"],
  },
  embed: {
    id: "embed",
    label: "Embedded dual-payload",
    nodes: ["encodePair", "embedFuse", "evaluate"],
  },
  damage: {
    id: "damage",
    label: "Constraint damage overlay",
    nodes: [
      ...QR_CORE,
      "rasterize",
      "constraintDamage",
      "applyDamage",
      "evaluate",
    ],
  },
};

/** QArt stages when context already has encode/matrix (UI path). */
export const QART_FROM_MATRIX_NODES = [
  "qartAppend",
  "rasterize",
  "qartOptimize",
  "qartRebuild",
  "evaluate",
] as const;

/** IS-QR stages when context already has encode/matrix (UI path). */
export const ISQR_FROM_MATRIX_NODES = [
  "isqrRoi",
  "rasterize",
  "qartOptimize",
  "qartRebuild",
  "isqrFuse",
  "dwtCsf",
  "evaluate",
] as const;

export function getPreset(id: string): PresetGraph | undefined {
  return PRESETS[id as PresetId];
}

export function resolvePresetNodes(id: PresetId | string): string[] {
  const preset = getPreset(id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return [...preset.nodes];
}

export function listPresetIds(): PresetId[] {
  return Object.keys(PRESETS) as PresetId[];
}
