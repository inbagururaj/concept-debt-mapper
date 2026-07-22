interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-(--rust) bg-(--paper) p-4 text-sm text-(--ink)">
      <p className="font-serif text-lg font-semibold">Prediction call failed</p>
      <p className="mt-2 font-mono text-xs text-(--ink-muted)">{message}</p>
      <p className="mt-2">
        Set <code className="font-mono">ANTHROPIC_API_KEY</code> in{" "}
        <code className="font-mono">.env.local</code> and restart the dev
        server.
      </p>
    </div>
  );
}
