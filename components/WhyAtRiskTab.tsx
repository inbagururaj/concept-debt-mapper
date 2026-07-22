import type { RiskPrediction } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

interface WhyAtRiskTabProps {
  prediction: RiskPrediction | undefined;
}

export function WhyAtRiskTab({ prediction }: WhyAtRiskTabProps) {
  if (!prediction) {
    return (
      <p className="font-mono text-xs text-(--ink-muted)">
        No prediction was returned for this topic.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm text-(--ink)">
      <RiskBadge
        riskProbability={prediction.riskProbability}
        confidence={prediction.confidence}
      />

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Reasoning
        </p>
        <p className="mt-1">{prediction.reasoning}</p>
      </div>

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Cited evidence
        </p>
        {prediction.citedEvidence.length > 0 ? (
          <ul className="mt-1.5 list-disc space-y-1 pl-4 font-mono text-xs">
            {prediction.citedEvidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 font-mono text-xs text-(--ink-muted)">
            No specific evidence cited — risk signal is minimal.
          </p>
        )}
      </div>

      <div>
        <p className="font-sans text-xs font-medium text-(--ink-muted)">
          Contributing weak prerequisites
        </p>
        {prediction.contributingWeakTopics.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {prediction.contributingWeakTopics.map((t) => (
              <li
                key={t}
                className="rounded border border-(--line) px-2 py-0.5 font-mono text-xs text-(--ink-muted)"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 font-mono text-xs text-(--ink-muted)">
            None — risk stems from this topic&rsquo;s own evidence, not its
            prerequisites.
          </p>
        )}
      </div>
    </div>
  );
}
