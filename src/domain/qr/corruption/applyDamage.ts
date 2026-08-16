import { QRMatrix, QRModule } from "../../shared/types";

function cloneModuleDamaged(module: QRModule): QRModule {
  const flippedValue = module.bit.value ^ 1;
  return {
    ...module,
    isDark: !module.isDark,
    bit: {
      ...module.bit,
      value: flippedValue,
    },
  };
}

/**
 * Return a new matrix with damaged modules visually/bit-inverted.
 * Does not mutate the source matrix.
 */
export function applyVisualDamage(
  matrix: QRMatrix,
  damagedModuleIds: Iterable<string>
): QRMatrix {
  const damaged = new Set(damagedModuleIds);
  if (damaged.size === 0) {
    return matrix;
  }

  const result = matrix.map((row) =>
    row.map((m) => {
      if (!m || !damaged.has(m.id)) return m;
      return cloneModuleDamaged(m);
    })
  ) as QRMatrix;

  if (typeof matrix.getModuleByBitId === "function") {
    // Preserve lookup helper if present on derived matrices
    const byBitId = new Map<string, QRModule>();
    for (let y = 0; y < result.length; y++) {
      for (let x = 0; x < result.length; x++) {
        const m = result[y][x];
        if (m?.bit?.id) byBitId.set(m.bit.id, m);
        if (m?.bitId) byBitId.set(m.bitId, m);
      }
    }
    result.getModuleByBitId = (bitId: string) => byBitId.get(bitId);
  }

  return result;
}

/**
 * Map damaged module ids to data/EC bit ids (excludes structural modules).
 */
export function damagedIdsToDataBitIds(
  matrix: QRMatrix,
  damagedModuleIds: Iterable<string>
): string[] {
  const damaged = new Set(damagedModuleIds);
  const bitIds: string[] = [];

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m || !damaged.has(m.id)) continue;
      if (m.nonData) continue;
      const bitId = m.bit?.id || m.bitId;
      if (bitId) bitIds.push(bitId);
    }
  }

  return bitIds;
}

/**
 * Count damaged modules split into data vs structural.
 */
export function countDamageByKind(
  matrix: QRMatrix,
  damagedModuleIds: Iterable<string>
): { data: number; structural: number; total: number } {
  const damaged = new Set(damagedModuleIds);
  let data = 0;
  let structural = 0;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m || !damaged.has(m.id)) continue;
      if (m.nonData) structural += 1;
      else data += 1;
    }
  }

  return { data, structural, total: data + structural };
}
