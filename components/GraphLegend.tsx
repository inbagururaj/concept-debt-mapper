const RISK_STOPS = [0, 0.25, 0.5, 0.75, 1];

/** Explains the two visual channels actually used on graph nodes: fill/border weight = risk, border style = confidence. */
export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-(--line) px-4 py-3 font-mono text-[11px] text-(--ink-muted)">
      <div className="flex items-center gap-2">
        <span>risk</span>
        <div className="flex items-center gap-1">
          {RISK_STOPS.map((r) => (
            <span
              key={r}
              className="h-3.5 w-3.5 rounded-sm border"
              style={{
                background: `color-mix(in oklch, var(--rust) ${Math.round(r * 100)}%, var(--paper-raised))`,
                borderColor: "var(--ink)",
                borderWidth: 1 + r * 3,
              }}
            />
          ))}
        </div>
        <span>low → high</span>
      </div>
      <div className="flex items-center gap-4">
        <span>confidence</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-(--ink)" /> high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-(--ink)" /> medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dotted border-(--ink)" /> low
        </span>
      </div>
    </div>
  );
}
