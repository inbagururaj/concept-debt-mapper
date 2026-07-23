import type { RiskPrediction, TopicEvidence } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

interface WhyAtRiskTabProps {
  prediction: RiskPrediction | undefined;
  evidence: TopicEvidence | undefined;
}

export function WhyAtRiskTab({ prediction, evidence }: WhyAtRiskTabProps) {
  if (!prediction) {
    return (
      <p className="font-mono text-xs text-(--ink-muted)">
        No prediction was returned for this topic.
      </p>
    );
  }

  const { contributingFactors } = prediction;
  const totalContribution = contributingFactors.reduce(
    (sum, f) => sum + f.contributionWeight,
    0,
  );
  const mistakesFromFactors = contributingFactors.reduce(
    (sum, f) => sum + f.citedMistakes.length,
    0,
  );

  const confidenceReason =
    contributingFactors.length > 0
      ? `${contributingFactors.length} prerequisite assessment${contributingFactors.length === 1 ? "" : "s"} available, ${mistakesFromFactors} tagged mistake${mistakesFromFactors === 1 ? "" : "s"}.`
      : evidence
        ? `Based on this topic's own evidence: ${evidence.mistakes.length} tagged mistake${evidence.mistakes.length === 1 ? "" : "s"}, no weak prerequisites traced.`
        : "No prerequisite or own evidence available for this topic.";

  return (
    <div className="space-y-4 text-sm text-(--ink)">
      <RiskBadge
        riskProbability={prediction.riskProbability}
        confidence={prediction.confidence}
      />

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Predicted because:
        </p>
        {contributingFactors.length > 0 ? (
          <ul className="mt-1.5 space-y-2">
            {contributingFactors.map((f) => (
              <li
                key={f.prerequisiteTopic}
                className="rounded border border-(--line) px-2.5 py-1.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    ✓ {f.prerequisiteTopic} — score {f.score}/100
                  </span>
                  <span className="text-(--ink-muted)">
                    {Math.round(f.contributionWeight)}% of risk
                  </span>
                </div>
                {f.citedMistakes.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-(--ink-muted)">
                    {f.citedMistakes.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 font-mono text-xs text-(--ink-muted)">
            No weak prerequisites traced — risk stems from this
            topic&rsquo;s own evidence. See reasoning below.
          </p>
        )}
      </div>

      {contributingFactors.length > 0 && (
        <p className="font-mono text-xs text-(--ink-muted)">
          These prerequisites contribute {Math.round(totalContribution)}% of
          the predicted risk.
        </p>
      )}

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Confidence: {prediction.confidence}
        </p>
        <p className="mt-1 font-mono text-xs text-(--ink-muted)">
          {confidenceReason}
        </p>
      </div>

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Reasoning
        </p>
        <p className="mt-1">{prediction.reasoning}</p>
      </div>
    </div>
  );
}
