"use client";

import { useState } from "react";
import type { RiskPrediction, StudentProfile, Topic } from "@/lib/types";
import { DependencyGraph } from "./DependencyGraph";
import { DetailPanel } from "./DetailPanel";
import { ScoreOverview } from "./ScoreOverview";

const MAX_REVIEW_SELECTIONS = 2;

interface DashboardProps {
  curriculum: Topic[];
  student: StudentProfile;
  predictions: RiskPrediction[];
}

export function Dashboard({ curriculum, student, predictions }: DashboardProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [reviewSelection, setReviewSelection] = useState<string[]>([]);

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
  const selectedPrediction = selectedTopic
    ? predictions.find((p) => p.topic === selectedTopic)
    : undefined;

  return (
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
  );
}
