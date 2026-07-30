import { estimateRemediation } from "@/lib/remediation";
import type { RiskPrediction } from "@/lib/types";

interface ReviewPlanTabProps {
  topic: string;
  prediction: RiskPrediction | undefined;
  allPredictions: RiskPrediction[];
  selectedReviewTopics: string[];
  onToggleReviewTopic: (topic: string) => void;
}

const MAX_SELECTIONS = 2;

export function ReviewPlanTab({
  topic,
  prediction,
  allPredictions,
  selectedReviewTopics,
  onToggleReviewTopic,
}: ReviewPlanTabProps) {
  if (!prediction) {
    return (
      <p className="font-mono text-xs text-(--ink-muted)">
        No prediction for this topic.
      </p>
    );
  }

  const options = prediction.contributingWeakTopics;
  const estimates = estimateRemediation(allPredictions, selectedReviewTopics);
  const ownEstimate = estimates.find((e) => e.topic === topic);
  const otherEstimates = estimates.filter((e) => e.topic !== topic);
  const adjustedRisk = ownEstimate?.adjustedRisk ?? prediction.riskProbability;
  const atSelectionLimit = selectedReviewTopics.length >= MAX_SELECTIONS;

  return (
    <div className="space-y-4 text-sm text-(--ink)">
      {options.length === 0 ? (
        <p className="font-mono text-xs text-(--ink-muted)">
          No prerequisites driving this risk — intrinsic to
          &ldquo;{topic}&rdquo;; not modeled by this estimator.
        </p>
      ) : (
        <div>
          <p className="font-sans text-xs font-medium text-(--ink-muted)">
            Recommended: review these first (pick up to {MAX_SELECTIONS})
          </p>
          <div className="mt-2 space-y-1.5">
            {options.map((option) => {
              const checked = selectedReviewTopics.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2 rounded border border-(--line) px-2.5 py-1.5 font-mono text-xs ${
                    !checked && atSelectionLimit
                      ? "opacity-40"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && atSelectionLimit}
                    onChange={() => onToggleReviewTopic(option)}
                    className="accent-(--pine)"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded border border-(--line) p-3">
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Risk estimate for &ldquo;{topic}&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-3 font-mono text-sm">
          <span>{Math.round(prediction.riskProbability * 100)}% before</span>
          <span className="text-(--ink-muted)">&rarr;</span>
          <span
            style={{
              color:
                selectedReviewTopics.length > 0 ? "var(--pine)" : "var(--ink)",
            }}
          >
            {Math.round(adjustedRisk * 100)}% after
          </span>
        </div>
        <p className="mt-2 font-mono text-[11px] text-(--ink-muted)">
          {selectedReviewTopics.length === 0
            ? "Select topics above to update estimate."
            : `Assumes review resolves up to 70% of traced risk (covers ${Math.round((ownEstimate?.traceCoverage ?? 0) * 100)}% of this topic's traced risk).`}
        </p>
      </div>

      {otherEstimates.length > 0 && (
        <div>
          <p className="font-sans text-xs font-medium text-(--ink-muted)">
            Also affected by this selection
          </p>
          <ul className="mt-1.5 space-y-1 font-mono text-xs">
            {otherEstimates.map((e) => (
              <li key={e.topic} className="flex items-center justify-between gap-2">
                <span>{e.topic}</span>
                <span className="text-(--ink-muted)">
                  {Math.round(e.originalRisk * 100)}% &rarr; {Math.round(e.adjustedRisk * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
