import { Dashboard } from "@/components/Dashboard";
import { CURRICULUM } from "@/lib/curriculum";
import { MissingApiKeyError, predictRisk } from "@/lib/predict";
import { STUDENT } from "@/lib/student";
import type { RiskPrediction } from "@/lib/types";

// Predictions come from a live model call over hardcoded data — no DB to
// cache against, so each request re-evaluates rather than serving a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  let predictions: RiskPrediction[] | null = null;
  let initialStatus: "ready" | "missing-key" | "error" = "missing-key";
  let initialMessage: string | undefined;

  try {
    predictions = await predictRisk();
    initialStatus = "ready";
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      initialStatus = "missing-key";
    } else {
      initialStatus = "error";
      initialMessage = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-(--ink)">
          Concept Debt Mapper
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-(--ink-muted)">
          Predicts which Algebra 1 concepts {STUDENT.name} is likely to
          struggle with next, by reasoning over a reviewed prerequisite graph
          and this student&rsquo;s evidence-tagged performance history.
        </p>
      </header>
      <Dashboard
        curriculum={CURRICULUM}
        student={STUDENT}
        initialPredictions={predictions}
        initialStatus={initialStatus}
        initialMessage={initialMessage}
      />
    </main>
  );
}
