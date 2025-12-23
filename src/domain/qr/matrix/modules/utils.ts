import { Bit, QRModule, Source } from "../../../shared/types";

interface ModuleParams {
  bit: Bit;
  x: number;
  y: number;
  isMasked: boolean;
}

export function makeModule({ bit, x, y, isMasked }: ModuleParams): QRModule {
  const value = bit.value === 1;
  const isDark = isMasked ? !value : value;
  return {
    id: `mod-${x}-${y}`,
    bitId: bit.id,
    bit,
    x,
    y,
    isDark,
    isMasked,
    type: "module",
  };
}

export function makeNonDataModule(value: number | string, source: Source, x: number, y: number): QRModule {
  const numValue = parseInt(value.toString());
  const bit: Bit = {
    value: numValue,
    id: source.name ?? crypto.randomUUID(),
    sourceId: source.id,
  };
  const module = makeModule({ bit, x, y, isMasked: false });
  return { ...module, nonData: true, source };
} 