import { Dashboard } from "@/components/Dashboard";
import { CURRICULUM } from "@/lib/curriculum";
import { MissingApiKeyError, predictRisk } from "@/lib/predict";
import { STUDENT } from "@/lib/student";
import type { RiskPrediction, TokenUsage } from "@/lib/types";

// Predictions come from a live model call over hardcoded data — no DB to
// cache against, so each request re-evaluates rather than serving a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  let predictions: RiskPrediction[] | null = null;
  let initialUsage: TokenUsage | undefined;
  let initialStatus: "ready" | "missing-key" | "error" = "missing-key";
  let initialMessage: string | undefined;

  try {
    const result = await predictRisk();
    predictions = result.predictions;
    initialUsage = result.usage;
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="font-serif text-4xl font-bold tracking-tight text-(--ink)">
          Concept Debt Mapper
        </h1>
        <p className="mt-2 max-w-2xl text-base text-(--ink)/80">
          Predicts {STUDENT.name}&rsquo;s next likely struggle in Algebra 1.
        </p>
      </header>
      <Dashboard
        curriculum={CURRICULUM}
        student={STUDENT}
        initialPredictions={predictions}
        initialUsage={initialUsage}
        initialStatus={initialStatus}
        initialMessage={initialMessage}
      />
    </main>
  );
}
