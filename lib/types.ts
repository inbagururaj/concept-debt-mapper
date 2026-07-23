/**
 * Shared types for the Concept Debt Mapper.
 *
 * Field names deliberately mirror the vocabulary used across curriculum,
 * student evidence, and prediction data so the same `topic` string acts as
 * the join key everywhere (curriculum node id, evidence key, prediction key).
 */

/** A single node in the hardcoded prerequisite graph. */
export interface Topic {
  topic: string;
  prerequisites: string[];
}

/** Real, evidence-tagged performance data for one topic. */
export interface TopicEvidence {
  topic: string;
  score: number;
  mistakes: string[];
}

export interface StudentProfile {
  name: string;
  grade: string;
  history: TopicEvidence[];
}

export type Confidence = "high" | "medium" | "low";

/** One LLM-produced risk assessment for a single topic. */
export interface RiskPrediction {
  topic: string;
  riskProbability: number;
  confidence: Confidence;
  reasoning: string;
  citedEvidence: string[];
  contributingWeakTopics: string[];
}

/** A deterministic before/after risk estimate produced by remediation.ts. */
export interface RemediationEstimate {
  topic: string;
  originalRisk: number;
  adjustedRisk: number;
  riskReduction: number;
  /** Fraction (0-1) of this topic's traced risk that the selection addresses. */
  traceCoverage: number;
}

/** Real token counts reported by the Anthropic API for one completed call. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Deterministic layout position for a topic node in the dependency graph. */
export interface GraphNodePosition {
  topic: string;
  level: number;
  column: number;
  columnsInLevel: number;
}
