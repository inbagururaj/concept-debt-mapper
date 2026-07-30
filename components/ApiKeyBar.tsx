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
  // Driven by `loading` directly rather than matching statusLabel text —
  // statusLabel now carries more than one loading-phase string
  // ("validating…", "generating graph…"), and string-matching would need
  // updating every time a new phase label is added.
  const isActive = !loading && statusLabel !== "no key active";

  return (
    <div className="rounded-lg border-2 border-(--pine)/40 bg-(--paper) p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          Anthropic API key
        </h2>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-(--ink-muted)">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse" : ""}`}
            style={{
              background: isActive ? "var(--pine)" : "var(--ink-muted)",
            }}
          />
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-(--ink-muted)">
        Session-only, never stored.
      </p>
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
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
      <div className="mt-3 flex items-center justify-between">
        {errorMessage ? (
          <p className="font-mono text-[11px] text-(--rust)/85">
            {errorMessage}
          </p>
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
