import type { Confidence } from "@/lib/types";

interface RiskBadgeProps {
  riskProbability: number;
  confidence: Confidence;
}

export function RiskBadge({ riskProbability, confidence }: RiskBadgeProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span
        className="rounded px-2 py-1 text-(--paper)"
        style={{
          background: `color-mix(in oklch, var(--rust) ${Math.round(riskProbability * 100)}%, var(--ink-muted))`,
        }}
      >
        risk {Math.round(riskProbability * 100)}%
      </span>
      <span className="rounded border border-(--line) px-2 py-1 text-(--ink-muted)">
        confidence: {confidence}
      </span>
    </div>
  );
}
