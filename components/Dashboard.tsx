"use client";

import { useState, useTransition } from "react";
import { runPrediction } from "@/app/actions";
import type { RiskPrediction, StudentProfile, Topic } from "@/lib/types";
import { ApiKeyBar } from "./ApiKeyBar";
import { DependencyGraph } from "./DependencyGraph";
import { DetailPanel } from "./DetailPanel";
import { ScoreOverview } from "./ScoreOverview";

const MAX_REVIEW_SELECTIONS = 2;

type KeySource = "env" | "session" | "none";
type Status = "ready" | "missing-key" | "error";

interface DashboardProps {
  curriculum: Topic[];
  student: StudentProfile;
  initialPredictions: RiskPrediction[] | null;
  initialStatus: Status;
  initialMessage?: string;
}

export function Dashboard({
  curriculum,
  student,
  initialPredictions,
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
  const [isPending, startTransition] = useTransition();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [reviewSelection, setReviewSelection] = useState<string[]>([]);

  const handleSubmitKey = () => {
    const key = apiKey.trim();
    if (!key) return;
    startTransition(async () => {
      const result = await runPrediction(key);
      if (result.ok) {
        setPredictions(result.predictions);
        setKeySource("session");
        setErrorMessage(undefined);
      } else {
        setErrorMessage(result.message);
      }
    });
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
    <div className="flex flex-col gap-5">
      <ApiKeyBar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onSubmit={handleSubmitKey}
        loading={isPending}
        statusLabel={statusLabel}
        errorMessage={errorMessage}
      />

      {predictions ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <ScoreOverview student={student} curriculum={curriculum} />
            <DependencyGraph
              curriculum={curriculum}
              student={student}
              predictions={predictions}
              selectedTopic={selectedTopic}
              onSelectTopic={handleSelectTopic}
            />
          </div>
          <div className="lg:sticky lg:top-5 lg:self-start">
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
              <div className="rounded-lg border border-(--line) bg-(--paper) p-4 text-sm text-(--ink-muted)">
                Click a topic in the dependency graph to see its evidence, the
                model&rsquo;s risk reasoning, and a review plan.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-(--line) bg-(--paper) p-4 text-sm text-(--ink-muted)">
          {isPending
            ? "Reasoning over the prerequisite graph and performance evidence…"
            : "No predictions yet — enter an Anthropic API key above and run it, or set ANTHROPIC_API_KEY in .env.local on the server."}
        </div>
      )}
    </div>
  );
}
