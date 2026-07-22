export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-(--ink)">
          Concept Debt Mapper
        </h1>
      </header>
      <p className="animate-pulse font-mono text-sm text-(--ink-muted)">
        Reasoning over the prerequisite graph and performance evidence…
      </p>
    </main>
  );
}
