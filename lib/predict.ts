import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { CURRICULUM } from "./curriculum";
import { STUDENT } from "./student";
import type { RiskPrediction, StudentProfile, Topic } from "./types";

const predictionSchema = z.object({
  predictions: z.array(
    z.object({
      topic: z.string(),
      riskProbability: z.number().min(0).max(1),
      confidence: z.enum(["high", "medium", "low"]),
      reasoning: z.string(),
      citedEvidence: z.array(z.string()),
      contributingWeakTopics: z.array(z.string()),
    }),
  ),
});

function buildPrompt(curriculum: Topic[], student: StudentProfile): string {
  const graph = curriculum
    .map((t) => `- "${t.topic}" requires: [${t.prerequisites.join(", ") || "none"}]`)
    .join("\n");

  const evidence = curriculum
    .map((t) => {
      const record = student.history.find((h) => h.topic === t.topic);
      if (!record) return `- "${t.topic}": UNTESTED (no score, no mistake data)`;
      const mistakes =
        record.mistakes.length > 0
          ? record.mistakes.map((m) => `"${m}"`).join(", ")
          : "none recorded";
      return `- "${t.topic}": score ${record.score}/100, mistakes: [${mistakes}]`;
    })
    .join("\n");

  return `You are analyzing one student's mastery of an Algebra 1 curriculum to predict which topics they are at risk of struggling with, including topics they have not yet attempted.

PREREQUISITE GRAPH (ground truth, do not contradict it):
${graph}

STUDENT PERFORMANCE EVIDENCE (${student.name}, ${student.grade}):
${evidence}

TASK:
For every topic in the curriculum, infer likely underlying misconceptions from the provided performance evidence (scores AND mistake tags) and from weakness in its prerequisite chain. Do not speculate beyond what the evidence supports.

For each topic, produce:
- riskProbability (0-1): likelihood this student will struggle with this topic, grounded in its own evidence and/or propagated weakness from its prerequisites per the graph above.
- confidence ("high" | "medium" | "low"): this MUST reflect evidence richness, not just risk level. A topic with detailed mistake tags on itself (or on the specific prerequisites driving its risk) deserves high or medium confidence. A topic that is UNTESTED and whose risk is inferred purely from upstream prerequisite scores with no mistake tags deserves LOW confidence, even if the inferred risk is high. Never assign high confidence to an untested topic.
- reasoning: 1-3 sentences explaining the inference.
- citedEvidence: the exact mistake strings or score facts (e.g. "Fractions score 58/100", "sign error on negative subtraction") that informed this specific topic's assessment. Only cite evidence that actually exists above — never invent a mistake string. Empty array if the topic is mastered with no risk signal.
- contributingWeakTopics: the subset of this topic's prerequisite chain (from the graph) whose weak evidence is driving this topic's risk. Empty array if risk stems only from this topic's own evidence or if there is no meaningful risk.

Return a prediction for every topic listed in the curriculum, including strong ones (low risk, low-to-medium confidence depending on evidence richness).`;
}

export async function predictRisk(): Promise<RiskPrediction[]> {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-5"),
    output: Output.object({ schema: predictionSchema }),
    prompt: buildPrompt(CURRICULUM, STUDENT),
  });
  return output.predictions;
}
