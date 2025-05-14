export function makeModule({ bit, x, y, isMasked }) {
  //console.debug("makeModule", arguments);
  let { value } = bit;
  value = !!value;
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

export function makeNonDataModule(value, source, x, y) {
  value = parseInt(value);
  const bit = {
    value,
    id: source.name,
    source,
  };
  const module = makeModule({ bit, x, y, isMasked: false });
  return { ...module, nonData: true, source };
}