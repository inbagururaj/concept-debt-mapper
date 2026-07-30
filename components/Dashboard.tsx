"use client";

import { useEffect, useRef, useState } from "react";
import type { GenerateGraphResponse } from "@/app/api/generate-graph/route";
import type { PredictResponse } from "@/app/api/predict/route";
import { parseStudentCsv } from "@/lib/csv";
import type { RiskPrediction, StudentProfile, TokenUsage, Topic } from "@/lib/types";
import { ApiKeyBar } from "./ApiKeyBar";
import { DataSourceBar, type DataSource } from "./DataSourceBar";
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
  /** Whether ANTHROPIC_API_KEY is set server-side, independent of whether the initial call succeeded. */
  hasEnvKey: boolean;
}

export function Dashboard({
  curriculum,
  student,
  initialPredictions,
  initialUsage,
  initialStatus,
  initialMessage,
  hasEnvKey,
}: DashboardProps) {
  const [predictions, setPredictions] = useState<RiskPrediction[] | null>(
    initialPredictions,
  );
  // The student whose evidence actually produced `predictions` — starts as
  // the demo prop (SSR always runs against it) and is swapped to the
  // uploaded profile only once a run against uploaded data succeeds, so the
  // graph/evidence panels never show data that doesn't match the
  // predictions currently on screen.
  const [activeStudent, setActiveStudent] = useState<StudentProfile>(student);
  // Same idea as activeStudent, but for the graph: the demo curriculum prop
  // until an uploaded-data run succeeds, then whatever graph-builder.ts
  // generated for that upload.
  const [activeCurriculum, setActiveCurriculum] = useState<Topic[]>(curriculum);
  const [dataSource, setDataSource] = useState<DataSource>("demo");
  const [uploadedStudent, setUploadedStudent] = useState<StudentProfile | null>(null);
  // Cached per uploaded file so re-running (e.g. after fixing a bad key)
  // doesn't re-spend a graph-generation call — cleared whenever a new file
  // is parsed.
  const [uploadedCurriculum, setUploadedCurriculum] = useState<Topic[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  // True only while the one-off graph-generation call for an upload is in
  // flight — distinguishes that phase from the prediction call itself in
  // the DataSourceBar button label; both are covered by `isLoading`.
  const [graphPhase, setGraphPhase] = useState(false);
  // Driven by hasEnvKey, not initialStatus — a call that errored (rate
  // limit, timeout, bad response) doesn't mean the key is missing.
  const [keySource, setKeySource] = useState<KeySource>(
    hasEnvKey ? "env" : "none",
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

  /**
   * Shared request path for both the API-key bar and the data-source bar.
   * `studentForRun`/`curriculumForRun` default to the demo profile/graph
   * (server-side default when omitted) or the uploaded pair — both become
   * `activeStudent`/`activeCurriculum` on success so the graph/evidence
   * panels line up with whatever predictions come back.
   */
  const runPrediction = (
    studentForRun: StudentProfile | undefined,
    curriculumForRun: Topic[] | undefined,
  ) => {
    if (isLoading) return;
    const key = apiKey.trim();
    if (!key && !hasEnvKey) return;

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
      body: JSON.stringify({
        apiKey: key || undefined,
        student: studentForRun,
        curriculum: curriculumForRun,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as PredictResponse;
        if (data.ok) {
          setPredictions(data.predictions);
          setActiveStudent(studentForRun ?? student);
          setActiveCurriculum(curriculumForRun ?? curriculum);
          setSelectedTopic(null);
          setReviewSelection([]);
          if (key) setKeySource("session");
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

  /**
   * Runs prediction against the uploaded student. If no graph has been
   * generated for this file yet, generates one first (one Claude call),
   * caches it in `uploadedCurriculum`, then reuses it on subsequent runs
   * (retry after fixing a key, re-running with a different provider, etc.)
   * without spending another graph-generation call.
   */
  const handleRunUploaded = async () => {
    if (!uploadedStudent || isLoading) return;
    const key = apiKey.trim();
    if (!key && !hasEnvKey) return;

    let curriculumForRun = uploadedCurriculum;
    if (!curriculumForRun) {
      setIsLoading(true);
      setGraphPhase(true);
      setErrorMessage(undefined);
      const topics = [...new Set(uploadedStudent.history.map((h) => h.topic))];
      try {
        const res = await fetch("/api/generate-graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key || undefined, topics }),
        });
        const data = (await res.json()) as GenerateGraphResponse;
        if (!data.ok) {
          setErrorMessage(data.message);
          setIsLoading(false);
          setGraphPhase(false);
          return;
        }
        curriculumForRun = data.curriculum;
        setUploadedCurriculum(data.curriculum);
        setTokensUsed((t) => t + data.usage.inputTokens + data.usage.outputTokens);
      } catch {
        setErrorMessage("Network error while generating the prerequisite graph.");
        setIsLoading(false);
        setGraphPhase(false);
        return;
      }
      setGraphPhase(false);
    }

    runPrediction(uploadedStudent, curriculumForRun);
  };

  const handleSubmitKey = () => {
    if (!apiKey.trim() || isLoading) return;
    if (dataSource === "upload") {
      if (!uploadedStudent) {
        setErrorMessage("Upload a CSV first.");
        return;
      }
      void handleRunUploaded();
    } else {
      runPrediction(undefined, undefined);
    }
  };

  const handleFileSelected = (file: File) => {
    setCsvError(null);
    setUploadedStudent(null);
    setUploadedCurriculum(null);
    file
      .text()
      .then((text) => {
        const result = parseStudentCsv(text);
        if (result.error) {
          setCsvError(result.error);
          return;
        }
        setUploadedStudent(result.student ?? null);
      })
      .catch(() => setCsvError("Could not read the file."));
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
    ? activeStudent.history.find((h) => h.topic === selectedTopic)
    : undefined;
  const selectedPrediction =
    selectedTopic && predictions
      ? predictions.find((p) => p.topic === selectedTopic)
      : undefined;

  const statusLabel = isLoading
    ? graphPhase
      ? "generating graph…"
      : "validating…"
    : keySource === "env"
      ? "server key active"
      : keySource === "session"
        ? "session key active"
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
      <DataSourceBar
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        onFileSelected={handleFileSelected}
        uploadedStudent={uploadedStudent}
        csvError={csvError}
        onRun={() => void handleRunUploaded()}
        canRun={Boolean(uploadedStudent) && !csvError && (hasEnvKey || apiKey.trim().length > 0)}
        loading={isLoading}
        runLabel={graphPhase ? "generating graph…" : isLoading ? "running…" : "run prediction on this data"}
        demoStudentName={student.name}
      />

      {predictions ? (
        <>
          <DependencyGraph
            curriculum={activeCurriculum}
            student={activeStudent}
            predictions={predictions}
            selectedTopic={selectedTopic}
            onSelectTopic={handleSelectTopic}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ScoreOverview student={activeStudent} curriculum={activeCurriculum} />
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
            graphPhase
              ? "Generating a prerequisite graph for your topics…"
              : "Reasoning over the prerequisite graph…"
          ) : hasEnvKey ? (
            <p className="text-(--ink)/80">
              {errorMessage
                ? "See error above."
                : "Server key detected — waiting on the first prediction."}
            </p>
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
