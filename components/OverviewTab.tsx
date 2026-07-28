import type { TopicEvidence } from "@/lib/types";

interface OverviewTabProps {
  topic: string;
  evidence: TopicEvidence | undefined;
}

export function OverviewTab({ topic, evidence }: OverviewTabProps) {
  if (!evidence) {
    return (
      <div className="text-sm text-(--ink)">
        <p className="font-mono text-xs text-(--ink-muted)">
          &ldquo;{topic}&rdquo; is untested.
        </p>
        <p className="mt-2">
          Risk here comes entirely from prerequisite evidence — see
          &ldquo;Why at risk.&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm text-(--ink)">
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-medium">{evidence.score}</span>
        <span className="font-mono text-xs text-(--ink-muted)">/ 100</span>
      </div>
      <p className="mt-3 font-sans text-xs font-medium text-(--ink-muted)">
        Tagged mistakes
      </p>
      {evidence.mistakes.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 font-mono text-xs text-(--ink)">
          {evidence.mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 font-mono text-xs text-(--ink-muted)">
          None recorded — score only.
        </p>
      )}
    </div>
  );
}
