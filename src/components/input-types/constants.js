export const QR_MODES = [
  "numeric",
  "alphanumeric",
  "byte",
  "kanji",
  "eci",
];

export const QR_MODE_LABELS = {
  numeric: "numeric",
  alphanumeric: "alphanumeric",
  byte: "byte",
  kanji: "kanji",
  eci: "eci",
  // Legacy modes kept for saved inputs until they are re-saved
  mixed: "byte",
  optimized: "byte",
  auto: "byte",
};

export const ENCODING_STRATEGIES = [
  "None",
  "Alphanumeric",
  "PER",
  "PER-ModHex",
  "PER-NTRU",
];

export const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export const MONACO_EDITOR_OPTIONS = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
  automaticLayout: true,
};
