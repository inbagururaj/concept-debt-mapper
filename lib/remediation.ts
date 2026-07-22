import type { RemediationEstimate, RiskPrediction } from "./types";

/**
 * Deterministic ceiling on how much of a downstream topic's traced risk a
 * single round of reviewing its weak prerequisite can realistically resolve.
 * Reviewing a prerequisite rarely erases 100% of downstream risk — some of
 * it is the student's own execution error on the downstream topic itself.
 * This is a fixed estimate, not a model output.
 */
const MAX_ADDRESSABLE_FRACTION = 0.7;

/**
 * Pure, deterministic risk-reduction estimate.
 *
 * For every flagged topic whose `contributingWeakTopics` (from the LLM
 * prediction) overlaps the student's selected "review these first" topics,
 * compute what fraction of that topic's traced risk is attributable to the
 * selected topics, then discount its risk by that fraction (bounded by
 * MAX_ADDRESSABLE_FRACTION). Topics with no overlap are omitted — reviewing
 * the selected topics has no estimated effect on them.
 */
export function estimateRemediation(
  predictions: RiskPrediction[],
  selectedReviewTopics: string[],
): RemediationEstimate[] {
  if (selectedReviewTopics.length === 0) return [];
  const selectedSet = new Set(selectedReviewTopics);

  const estimates: RemediationEstimate[] = [];
  for (const prediction of predictions) {
    if (selectedSet.has(prediction.topic)) continue;
    if (prediction.contributingWeakTopics.length === 0) continue;

    const addressed = prediction.contributingWeakTopics.filter((t) =>
      selectedSet.has(t),
    ).length;
    if (addressed === 0) continue;

    const traceCoverage = addressed / prediction.contributingWeakTopics.length;
    const originalRisk = prediction.riskProbability;
    const adjustedRisk =
      originalRisk * (1 - traceCoverage * MAX_ADDRESSABLE_FRACTION);

    estimates.push({
      topic: prediction.topic,
      originalRisk,
      adjustedRisk,
      riskReduction: originalRisk - adjustedRisk,
      traceCoverage,
    });
  }

  return estimates.sort((a, b) => b.riskReduction - a.riskReduction);
}
