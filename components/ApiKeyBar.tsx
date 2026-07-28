"use client";

import { useState } from "react";

interface ApiKeyBarProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  statusLabel: string;
  errorMessage?: string | null;
  tokensUsed: number;
}

export function ApiKeyBar({
  apiKey,
  onApiKeyChange,
  onSubmit,
  onCancel,
  loading,
  statusLabel,
  errorMessage,
  tokensUsed,
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
        Session-only, never stored.
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
          name="anthropic-api-key-no-autofill"
          id="anthropic-api-key-no-autofill"
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          disabled={loading}
          className="min-w-0 flex-1 rounded border border-(--line) bg-(--paper-raised) px-2.5 py-1.5 font-mono text-xs text-(--ink) outline-none focus:border-(--pine) disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded border border-(--line) px-2.5 py-1.5 font-mono text-xs text-(--ink-muted) cursor-pointer"
        >
          {revealed ? "hide" : "show"}
        </button>
        {loading ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-(--rust) px-3 py-1.5 font-mono text-xs text-(--rust) cursor-pointer"
          >
            cancel
          </button>
        ) : (
          <button
            type="submit"
            disabled={apiKey.trim().length === 0}
            className="rounded bg-(--pine) px-3 py-1.5 font-mono text-xs text-(--paper) disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            use this key
          </button>
        )}
      </form>
      <div className="mt-2 flex items-center justify-between">
        {errorMessage ? (
          <p className="font-mono text-xs text-(--rust)">{errorMessage}</p>
        ) : (
          <span />
        )}
        <p className="font-mono text-[11px] text-(--ink-muted)">
          {tokensUsed.toLocaleString()} tokens used this session
        </p>
      </div>
    </div>
  );
}
