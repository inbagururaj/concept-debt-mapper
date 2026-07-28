"use client";

import { useEffect, useRef, useState } from "react";
import type { PredictResponse } from "@/app/api/predict/route";
import type { RiskPrediction, StudentProfile, TokenUsage, Topic } from "@/lib/types";
import { ApiKeyBar } from "./ApiKeyBar";
import { DependencyGraph } from "./DependencyGraph";
import { DetailPanel } from "./DetailPanel";
import { ScoreOverview } from "./ScoreOverview";

const MAX_REVIEW_SELECTIONS = 2;
const REQUEST_TIMEOUT_MS = 60_000;

/** One-line "why" for the top-risk headline — top traced prerequisite if any, else the model's own reasoning. */
function headlineReason(prediction: RiskPrediction): string {
  const top = [...prediction.contributingFactors].sort(
    (a, b) => b.contributionWeight - a.contributionWeight,
  )[0];
  if (top) {
    return `Driven mainly by weak "${top.prerequisiteTopic}" (score ${top.score}/100, ${Math.round(top.contributionWeight)}% of risk).`;
  }
  return prediction.reasoning;
}

type KeySource = "env" | "session" | "none";
type Status = "ready" | "missing-key" | "error";

interface DashboardProps {
  curriculum: Topic[];
  student: StudentProfile;
  initialPredictions: RiskPrediction[] | null;
  initialUsage?: TokenUsage;
  initialStatus: Status;
  initialMessage?: string;
}

export function Dashboard({
  curriculum,
  student,
  initialPredictions,
  initialUsage,
  initialStatus,
  initialMessage,
}: DashboardProps) {
  const [predictions, setPredictions] = useState<RiskPrediction[] | null>(
    initialPredictions,
  );
  const [keySource, setKeySource] = useState<KeySource>(
    initialStatus === "ready" ? "env" : "none",
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    initialStatus === "error" ? initialMessage : undefined,
  );
  const [apiKey, setApiKey] = useState("");
  const [tokensUsed, setTokensUsed] = useState(
    initialUsage ? initialUsage.inputTokens + initialUsage.outputTokens : 0,
  );
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [reviewSelection, setReviewSelection] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const timedOutRef = useRef(false);

  // Best-effort cleanup: abort any in-flight request if the dashboard unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, []);

  const handleSubmitKey = () => {
    const key = apiKey.trim();
    if (!key || isLoading) return;

    cancelledRef.current = false;
    timedOutRef.current = false;
    setErrorMessage(undefined);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    timeoutIdRef.current = setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as PredictResponse;
        if (data.ok) {
          setPredictions(data.predictions);
          setKeySource("session");
          setTokensUsed((t) => t + data.usage.inputTokens + data.usage.outputTokens);
        } else {
          setErrorMessage(data.message);
        }
      })
      .catch(() => {
        if (cancelledRef.current) {
          setErrorMessage("Cancelled.");
        } else if (timedOutRef.current) {
          setErrorMessage(
            "Request timed out after 60s. Check your connection and try again.",
          );
        } else {
          setErrorMessage("Network error — the request failed before reaching the server.");
        }
      })
      .finally(() => {
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        abortControllerRef.current = null;
        setIsLoading(false);
      });
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setReviewSelection([]);
  };

  const handleToggleReviewTopic = (topic: string) => {
    setReviewSelection((current) => {
      if (current.includes(topic)) return current.filter((t) => t !== topic);
      if (current.length >= MAX_REVIEW_SELECTIONS) return current;
      return [...current, topic];
    });
  };

  const topRiskPrediction =
    predictions && predictions.length > 0
      ? predictions.reduce((max, p) =>
          p.riskProbability > max.riskProbability ? p : max,
        )
      : null;

  const selectedEvidence = selectedTopic
    ? student.history.find((h) => h.topic === selectedTopic)
    : undefined;
  const selectedPrediction =
    selectedTopic && predictions
      ? predictions.find((p) => p.topic === selectedTopic)
      : undefined;

  const statusLabel =
    keySource === "env"
      ? "using server-configured key"
      : keySource === "session"
        ? "using your session key"
        : "no key active";

  return (
    <div className="flex flex-col gap-8">
      {topRiskPrediction && (
        <div className="rounded-lg border border-(--rust) bg-(--paper) p-6">
          <p className="font-sans text-[11px] font-medium tracking-wide text-(--ink-muted) uppercase">
            Next concept likely to fail
          </p>
          <p className="mt-1.5 font-serif text-2xl font-bold text-(--ink)">
            {topRiskPrediction.topic} —{" "}
            {Math.round(topRiskPrediction.riskProbability * 100)}% risk
          </p>
          <p className="mt-1.5 text-sm text-(--ink)/80">
            {headlineReason(topRiskPrediction)}
          </p>
        </div>
      )}
      <ApiKeyBar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onSubmit={handleSubmitKey}
        onCancel={handleCancel}
        loading={isLoading}
        statusLabel={statusLabel}
        errorMessage={errorMessage}
        tokensUsed={tokensUsed}
      />

      {predictions ? (
        <>
          <DependencyGraph
            curriculum={curriculum}
            student={student}
            predictions={predictions}
            selectedTopic={selectedTopic}
            onSelectTopic={handleSelectTopic}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ScoreOverview student={student} curriculum={curriculum} />
            {selectedTopic ? (
              <DetailPanel
                key={selectedTopic}
                topic={selectedTopic}
                evidence={selectedEvidence}
                prediction={selectedPrediction}
                allPredictions={predictions}
                selectedReviewTopics={reviewSelection}
                onToggleReviewTopic={handleToggleReviewTopic}
              />
            ) : (
              <div className="rounded-lg border border-(--line)/60 bg-(--paper) p-6 text-sm text-(--ink-muted)">
                Click a topic to see its evidence, risk reasoning, and review
                plan.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-(--line)/60 bg-(--paper) p-6 text-sm text-(--ink-muted)">
          {isLoading ? (
            "Reasoning over the prerequisite graph…"
          ) : (
            <>
              <p className="text-(--ink)/80">Enter an API key to begin.</p>
              <p className="mt-1 font-mono text-[11px] text-(--ink-muted)">
                Or set ANTHROPIC_API_KEY in .env.local.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
