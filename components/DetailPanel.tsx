"use client";

import { useState } from "react";
import type { RiskPrediction, TopicEvidence } from "@/lib/types";
import { OverviewTab } from "./OverviewTab";
import { ReviewPlanTab } from "./ReviewPlanTab";
import { WhyAtRiskTab } from "./WhyAtRiskTab";

type TabId = "overview" | "why" | "plan";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "why", label: "Why at risk" },
  { id: "plan", label: "Review plan" },
];

interface DetailPanelProps {
  topic: string;
  evidence: TopicEvidence | undefined;
  prediction: RiskPrediction | undefined;
  allPredictions: RiskPrediction[];
  selectedReviewTopics: string[];
  onToggleReviewTopic: (topic: string) => void;
}

export function DetailPanel({
  topic,
  evidence,
  prediction,
  allPredictions,
  selectedReviewTopics,
  onToggleReviewTopic,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="rounded-lg border border-(--line)/60 bg-(--paper) p-6">
      <h2 className="font-serif text-lg font-semibold text-(--ink)">{topic}</h2>
      <div className="mt-3 flex gap-1 border-b border-(--line)">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="-mb-px px-3 py-2 font-sans text-xs font-medium cursor-pointer"
            style={{
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--pine)"
                  : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {activeTab === "overview" && <OverviewTab topic={topic} evidence={evidence} />}
        {activeTab === "why" && (
          <WhyAtRiskTab prediction={prediction} evidence={evidence} />
        )}
        {activeTab === "plan" && (
          <ReviewPlanTab
            topic={topic}
            prediction={prediction}
            allPredictions={allPredictions}
            selectedReviewTopics={selectedReviewTopics}
            onToggleReviewTopic={onToggleReviewTopic}
          />
        )}
      </div>
    </div>
  );
}
