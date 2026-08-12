export const CHART = {
  accent: "var(--accent)",
  danger: "var(--danger)",
  border: "var(--border-subtle)",
  muted: "var(--text-muted)",
  primary: "var(--text-primary)",
  surface: "var(--surface)",
  surfaceRaised: "var(--surface-raised)",
  success: "var(--success)",
};

// categorical palette derived live from the theme accent via OKLCH relative color:
// rotate hue, keep the theme's lightness, floor chroma so desaturated themes (mono)
// still produce distinguishable slices. reactive to theme switches with zero JS.
const CAT_HUES = [0, 150, 60, 240, 300, 30, 190, 330];

export function catColor(i: number, alpha = 1) {
  const h = CAT_HUES[i % CAT_HUES.length];
  return `oklch(from ${CHART.accent} l max(c, 0.12) calc(h + ${h}) / ${alpha})`;
}