"use client";

import { useMemo } from "react";
import { computeGraphLayout } from "@/lib/graph-layout";
import type { RiskPrediction, StudentProfile, Topic } from "@/lib/types";
import { GraphEdge } from "./GraphEdge";
import { GraphLegend } from "./GraphLegend";
import { GraphNode } from "./GraphNode";

const NODE_WIDTH = 126;
const NODE_HEIGHT = 64;
// Horizontal flow: level (prerequisite depth) runs left-to-right along the
// x-axis, so a 20-node, 8-level-deep graph reads as a short wide band
// instead of a tall column that needs scrolling to see fully.
const LEVEL_GAP = 142;
const ROW_GAP = 96;
const PADDING = 28;

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

  const maxRowsInLevel = Math.max(...layout.map((n) => n.columnsInLevel));
  const maxLevel = Math.max(...layout.map((n) => n.level));
  const levelCount = maxLevel + 1;
  const width = PADDING * 2 + levelCount * LEVEL_GAP;
  const height = PADDING * 2 + maxRowsInLevel * ROW_GAP;

  const centerOf = (node: (typeof layout)[number]) => {
    const levelHeight = node.columnsInLevel * ROW_GAP;
    const levelOffset = (maxRowsInLevel * ROW_GAP - levelHeight) / 2;
    const x = PADDING + node.level * LEVEL_GAP + LEVEL_GAP / 2;
    const y = PADDING + levelOffset + node.column * ROW_GAP + ROW_GAP / 2;
    return { x, y };
  };

  const positionByTopic = new Map(layout.map((n) => [n.topic, { node: n, center: centerOf(n) }]));
  const predictionByTopic = new Map(predictions.map((p) => [p.topic, p]));
  const evidenceTopics = new Set(student.history.map((h) => h.topic));

  return (
    <div className="rounded-lg border border-(--line)/60 bg-(--paper) overflow-hidden">
      <div className="flex items-baseline justify-between px-6 pt-6">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          Prerequisite dependency graph
        </h2>
        <p className="font-mono text-[11px] text-(--ink-muted)">
          {curriculum.length} topics · flows left (foundational) to right
          (advanced) · click a node for detail
        </p>
      </div>
      <div className="overflow-x-auto px-4 py-2">
        <svg width={width} height={height} role="img" aria-label="Prerequisite dependency graph, flowing left to right by prerequisite depth">
          <g>
            {curriculum.flatMap((t) =>
              t.prerequisites.map((prereq) => {
                const from = positionByTopic.get(prereq);
                const to = positionByTopic.get(t.topic);
                if (!from || !to) return null;
                return (
                  <GraphEdge
                    key={`${prereq}->${t.topic}`}
                    fromX={from.center.x + NODE_WIDTH / 2}
                    fromY={from.center.y}
                    toX={to.center.x - NODE_WIDTH / 2}
                    toY={to.center.y}
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
