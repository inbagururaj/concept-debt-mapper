interface GraphEdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** A single prerequisite -> dependent edge, curving horizontally left to right. */
export function GraphEdge({ fromX, fromY, toX, toY }: GraphEdgeProps) {
  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
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
