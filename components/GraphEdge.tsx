interface GraphEdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** A single prerequisite -> dependent edge, drawn as a gentle curve. */
export function GraphEdge({ fromX, fromY, toX, toY }: GraphEdgeProps) {
  const midY = (fromY + toY) / 2;
  const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
  return (
    <path
      d={path}
      fill="none"
      stroke="var(--ink)"
      strokeOpacity={0.28}
      strokeWidth={1.25}
    />
  );
}
