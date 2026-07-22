import type { GraphNodePosition, Topic } from "./types";

/**
 * Pure, deterministic layered layout for the prerequisite DAG.
 *
 * Each topic's level is its longest path distance from any root (a topic
 * with no prerequisites) — this keeps every prerequisite strictly above the
 * topics that depend on it, which is what makes the graph legible as a
 * dependency diagram rather than an arbitrary node scatter. No physics
 * simulation, no randomness: the same curriculum always produces the same
 * layout.
 */
export function computeGraphLayout(curriculum: Topic[]): GraphNodePosition[] {
  const byTopic = new Map(curriculum.map((t) => [t.topic, t]));
  const levelCache = new Map<string, number>();

  function levelOf(topic: string, visiting: Set<string>): number {
    const cached = levelCache.get(topic);
    if (cached !== undefined) return cached;
    if (visiting.has(topic)) {
      throw new Error(`Cycle detected in curriculum graph at "${topic}"`);
    }
    const node = byTopic.get(topic);
    const prerequisites = node?.prerequisites ?? [];
    if (prerequisites.length === 0) {
      levelCache.set(topic, 0);
      return 0;
    }
    visiting.add(topic);
    const level =
      1 + Math.max(...prerequisites.map((p) => levelOf(p, visiting)));
    visiting.delete(topic);
    levelCache.set(topic, level);
    return level;
  }

  for (const t of curriculum) levelOf(t.topic, new Set());

  const topicsByLevel = new Map<number, string[]>();
  for (const t of curriculum) {
    const level = levelCache.get(t.topic)!;
    const bucket = topicsByLevel.get(level) ?? [];
    bucket.push(t.topic);
    topicsByLevel.set(level, bucket);
  }

  const positions: GraphNodePosition[] = [];
  for (const [level, topics] of topicsByLevel) {
    topics.forEach((topic, column) => {
      positions.push({ topic, level, column, columnsInLevel: topics.length });
    });
  }
  return positions;
}
