"use client";

import { useState } from "react";

interface ApiKeyBarProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSubmit: () => void;
  loading: boolean;
  statusLabel: string;
  errorMessage?: string | null;
}

export function ApiKeyBar({
  apiKey,
  onApiKeyChange,
  onSubmit,
  loading,
  statusLabel,
  errorMessage,
}: ApiKeyBarProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-lg border border-(--line) bg-(--paper) p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          Anthropic API key
        </h2>
        <p className="font-mono text-[11px] text-(--ink-muted)">{statusLabel}</p>
      </div>
      <p className="mt-1 text-xs text-(--ink-muted)">
        Stored only in this browser session, never sent anywhere but
        Anthropic. It resets on reload.
      </p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          type={revealed ? "text" : "password"}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          className="min-w-0 flex-1 rounded border border-(--line) bg-(--paper-raised) px-2.5 py-1.5 font-mono text-xs text-(--ink) outline-none focus:border-(--pine)"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded border border-(--line) px-2.5 py-1.5 font-mono text-xs text-(--ink-muted) cursor-pointer"
        >
          {revealed ? "hide" : "show"}
        </button>
        <button
          type="submit"
          disabled={loading || apiKey.trim().length === 0}
          className="rounded bg-(--pine) px-3 py-1.5 font-mono text-xs text-(--paper) disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "running…" : "use this key"}
        </button>
      </form>
      {errorMessage && (
        <p className="mt-2 font-mono text-xs text-(--rust)">{errorMessage}</p>
      )}
    </div>
  );
}
