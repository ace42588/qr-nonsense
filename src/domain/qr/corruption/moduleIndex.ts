import { QRMatrix, QRModule } from "../../shared/types";

export type FinderCorner = "tl" | "tr" | "bl";

export function getModuleKey(module: QRModule): string {
  return module.id;
}

export function collectByPattern(
  matrix: QRMatrix,
  patternName: string
): QRModule[] {
  const result: QRModule[] = [];
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (m?.nonData && m.source?.name === patternName) {
        result.push(m);
      }
    }
  }
  return result;
}

/**
 * Collect FinderPattern modules in one corner (7×7).
 */
export function collectFinderCorner(
  matrix: QRMatrix,
  corner: FinderCorner
): QRModule[] {
  const dimension = matrix.length;
  const finderSize = 7;
  let startX = 0;
  let startY = 0;

  if (corner === "tl") {
    startX = 0;
    startY = 0;
  } else if (corner === "tr") {
    startX = dimension - finderSize;
    startY = 0;
  } else {
    startX = 0;
    startY = dimension - finderSize;
  }

  const result: QRModule[] = [];
  for (let y = startY; y < startY + finderSize; y++) {
    for (let x = startX; x < startX + finderSize; x++) {
      const m = matrix[y]?.[x];
      if (m?.nonData && m.source?.name === "FinderPattern") {
        result.push(m);
      }
    }
  }
  return result;
}

/** Patterns excluded from brute-force collision flip candidates. */
export const COLLISION_EXCLUDED_PATTERNS = new Set([
  "FinderPattern",
  "TimingPattern",
  "AlignmentPattern",
  "Separator",
]);

const FORMAT_META_PATTERNS = new Set(["FormatInfo", "VersionInfo"]);

const NON_PAYLOAD_SEGMENT_TYPES = new Set([
  "terminator",
  "fill",
  "padding",
]);

/**
 * Module ids eligible for collision search: data/EC, format, version, etc.
 * Excludes finder, timing, alignment, and separator modules.
 */
export function eligibleCollisionModules(matrix: QRMatrix): string[] {
  const ids: string[] = [];
  if (!matrix?.length) return ids;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m?.id) continue;
      const pattern = m.nonData ? m.source?.name : undefined;
      if (pattern && COLLISION_EXCLUDED_PATTERNS.has(pattern)) continue;
      ids.push(m.id);
    }
  }
  return ids;
}

/** Format + version info modules only. */
export function eligibleFormatMetaModules(matrix: QRMatrix): string[] {
  const ids: string[] = [];
  if (!matrix?.length) return ids;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m?.id || !m.nonData) continue;
      const name = m.source?.name;
      if (name && FORMAT_META_PATTERNS.has(name)) ids.push(m.id);
    }
  }
  return ids;
}

/** Data/EC modules only (excludes all nonData patterns). */
export function eligibleDataEcModules(matrix: QRMatrix): string[] {
  const ids: string[] = [];
  if (!matrix?.length) return ids;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m?.id || m.nonData) continue;
      ids.push(m.id);
    }
  }
  return ids;
}

/**
 * Map segment id → type for worker-safe padding/terminator filtering.
 */
export function buildSegmentTypesBySourceId(
  segments: Iterable<{ id?: string; type?: string }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of segments) {
    if (s?.id && s.type) out[s.id] = s.type;
  }
  return out;
}

export interface EligibleTierModules {
  /** Payload data modules (not terminator/fill/padding). */
  payload: string[];
  /** EC modules. */
  ec: string[];
  /** Terminator / fill / padding data modules. */
  paddingLike: string[];
  /** payload then ec then paddingLike (priority order for phase D). */
  ordered: string[];
}

/**
 * Tier data/EC modules for priority sampling.
 * `segmentTypesBySourceId` maps bit.sourceId → segment type.
 * `ecBitIds` marks error-correction bit ids (from blocks); without it, all
 * data modules are treated as payload (except padding segment types).
 */
export function eligibleTieredDataModules(
  matrix: QRMatrix,
  segmentTypesBySourceId?: Record<string, string>,
  ecBitIds?: ReadonlySet<string>
): EligibleTierModules {
  const payload: string[] = [];
  const ec: string[] = [];
  const paddingLike: string[] = [];

  if (!matrix?.length) {
    return { payload, ec, paddingLike, ordered: [] };
  }

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m?.id || m.nonData) continue;

      const bitId = m.bit?.id || m.bitId;
      if (bitId && ecBitIds?.has(bitId)) {
        ec.push(m.id);
        continue;
      }

      const segType =
        (m.bit?.sourceId && segmentTypesBySourceId?.[m.bit.sourceId]) ||
        undefined;
      if (segType && NON_PAYLOAD_SEGMENT_TYPES.has(segType)) {
        paddingLike.push(m.id);
      } else {
        payload.push(m.id);
      }
    }
  }

  return {
    payload,
    ec,
    paddingLike,
    ordered: [...payload, ...ec, ...paddingLike],
  };
}

export function indexMatrix(matrix: QRMatrix): {
  byId: Map<string, QRModule>;
  byPattern: Map<string, QRModule[]>;
} {
  const byId = new Map<string, QRModule>();
  const byPattern = new Map<string, QRModule[]>();

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m) continue;
      byId.set(m.id, m);
      if (m.nonData && m.source?.name) {
        const list = byPattern.get(m.source.name) ?? [];
        list.push(m);
        byPattern.set(m.source.name, list);
      }
    }
  }

  return { byId, byPattern };
}
