import { Dashboard } from "@/components/Dashboard";
import { ErrorState } from "@/components/ErrorState";
import { CURRICULUM } from "@/lib/curriculum";
import { predictRisk } from "@/lib/predict";
import { STUDENT } from "@/lib/student";

// Predictions come from a live model call over hardcoded data — no DB to
// cache against, so each request re-evaluates rather than serving a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  let predictions;
  let errorMessage: string | null = null;
  try {
    predictions = await predictRisk();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
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
      {errorMessage || !predictions ? (
        <ErrorState message={errorMessage ?? "No predictions were returned."} />
      ) : (
        <Dashboard curriculum={CURRICULUM} student={STUDENT} predictions={predictions} />
      )}
    </main>
  );
}
