"use client";

import { useMemo } from "react";
import { computeGraphLayout } from "@/lib/graph-layout";
import type { RiskPrediction, StudentProfile, Topic } from "@/lib/types";
import { GraphEdge } from "./GraphEdge";
import { GraphLegend } from "./GraphLegend";
import { GraphNode } from "./GraphNode";

const NODE_WIDTH = 172;
const NODE_HEIGHT = 60;
const COLUMN_GAP = 204;
const ROW_GAP = 118;
const PADDING = 32;

interface DependencyGraphProps {
  curriculum: Topic[];
  student: StudentProfile;
  predictions: RiskPrediction[];
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
}

export function DependencyGraph({
  curriculum,
  student,
  predictions,
  selectedTopic,
  onSelectTopic,
}: DependencyGraphProps) {
  const layout = useMemo(() => computeGraphLayout(curriculum), [curriculum]);

  const maxColumns = Math.max(...layout.map((n) => n.columnsInLevel));
  const maxLevel = Math.max(...layout.map((n) => n.level));
  const width = PADDING * 2 + maxColumns * COLUMN_GAP;
  const height = PADDING * 2 + (maxLevel + 1) * ROW_GAP;

  const centerOf = (node: (typeof layout)[number]) => {
    const levelWidth = node.columnsInLevel * COLUMN_GAP;
    const levelOffset = (maxColumns * COLUMN_GAP - levelWidth) / 2;
    const x = PADDING + levelOffset + node.column * COLUMN_GAP + COLUMN_GAP / 2;
    const y = PADDING + node.level * ROW_GAP + ROW_GAP / 2;
    return { x, y };
  };

  const positionByTopic = new Map(layout.map((n) => [n.topic, { node: n, center: centerOf(n) }]));
  const predictionByTopic = new Map(predictions.map((p) => [p.topic, p]));
  const evidenceTopics = new Set(student.history.map((h) => h.topic));

  return (
    <div className="rounded-lg border border-(--line) bg-(--paper) overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          Prerequisite dependency graph
        </h2>
        <p className="font-mono text-[11px] text-(--ink-muted)">
          {curriculum.length} topics · click a node for detail
        </p>
      </div>
      <div className="overflow-x-auto px-2 py-2">
        <svg width={width} height={height} role="img" aria-label="Algebra 1 prerequisite dependency graph">
          <g>
            {curriculum.flatMap((t) =>
              t.prerequisites.map((prereq) => {
                const from = positionByTopic.get(prereq);
                const to = positionByTopic.get(t.topic);
                if (!from || !to) return null;
                return (
                  <GraphEdge
                    key={`${prereq}->${t.topic}`}
                    fromX={from.center.x}
                    fromY={from.center.y + NODE_HEIGHT / 2}
                    toX={to.center.x}
                    toY={to.center.y - NODE_HEIGHT / 2}
                  />
                );
              }),
            )}
          </g>
          <g>
            {layout.map(({ topic }) => {
              const { center } = positionByTopic.get(topic)!;
              return (
                <GraphNode
                  key={topic}
                  topic={topic}
                  x={center.x - NODE_WIDTH / 2}
                  y={center.y - NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  prediction={predictionByTopic.get(topic)}
                  isSelected={selectedTopic === topic}
                  isUntested={!evidenceTopics.has(topic)}
                  onSelect={onSelectTopic}
                />
              );
            })}
          </g>
        </svg>
      </div>
      <GraphLegend />
    </div>
  );
}
