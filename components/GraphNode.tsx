"use client";

import { confidenceBorderStyle, riskBorderWidth, riskFill } from "@/lib/visual";
import type { RiskPrediction } from "@/lib/types";

interface GraphNodeProps {
  topic: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prediction: RiskPrediction | undefined;
  isSelected: boolean;
  isUntested: boolean;
  onSelect: (topic: string) => void;
}

export function GraphNode({
  topic,
  x,
  y,
  width,
  height,
  prediction,
  isSelected,
  isUntested,
  onSelect,
}: GraphNodeProps) {
  const risk = prediction?.riskProbability ?? 0;

  return (
    <foreignObject x={x} y={y} width={width} height={height} overflow="visible">
      <button
        type="button"
        onClick={() => onSelect(topic)}
        className="flex h-full w-full flex-col justify-between rounded-md px-2.5 py-2 text-left transition-shadow cursor-pointer"
        style={{
          background: riskFill(risk),
          borderColor: isSelected ? "var(--pine)" : "var(--ink)",
          borderWidth: isSelected ? 2.5 : riskBorderWidth(risk),
          borderStyle: prediction ? confidenceBorderStyle(prediction.confidence) : "solid",
          boxShadow: isSelected ? "0 0 0 2px var(--pine)" : "none",
        }}
      >
        <span className="font-sans text-[11px] font-medium leading-tight text-(--ink)">
          {topic}
        </span>
        <span className="font-mono text-[10px] text-(--ink-muted)">
          {isUntested ? "untested" : "tested"}
          {prediction ? ` · risk ${Math.round(risk * 100)}%` : ""}
        </span>
      </button>
    </foreignObject>
  );
}
