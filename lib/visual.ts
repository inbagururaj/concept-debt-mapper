import type { Confidence } from "./types";

/**
 * Node fill: interpolates from paper (0 risk) to full rust saturation
 * (1.0 risk) via CSS color-mix, so color intensity is tied directly to the
 * computed riskProbability rather than a fixed palette of discrete states.
 */
export function riskFill(riskProbability: number): string {
  const pct = Math.round(clamp01(riskProbability) * 100);
  return `color-mix(in oklch, var(--rust) ${pct}%, var(--paper-raised))`;
}

/**
 * Border weight (px) scales with risk: near-zero risk gets a hairline
 * border, maximum risk gets a heavy border. This is the second visual
 * channel (alongside fill) that encodes the same underlying number.
 */
export function riskBorderWidth(riskProbability: number): number {
  return 1 + clamp01(riskProbability) * 3;
}

/**
 * Border style encodes confidence — a separate axis from risk magnitude.
 * A high-risk, low-confidence topic should visually read as "uncertain",
 * not just "less risky".
 */
export function confidenceBorderStyle(confidence: Confidence): "solid" | "dashed" | "dotted" {
  switch (confidence) {
    case "high":
      return "solid";
    case "medium":
      return "dashed";
    case "low":
      return "dotted";
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
