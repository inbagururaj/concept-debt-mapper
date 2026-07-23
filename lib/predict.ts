import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { CURRICULUM } from "./curriculum";
import { STUDENT } from "./student";
import type { RiskPrediction, StudentProfile, TokenUsage, Topic } from "./types";

const PREDICTION_TIMEOUT_MS = 60_000;

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

/** Thrown when neither a user-supplied key nor ANTHROPIC_API_KEY is available. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("No Anthropic API key available.");
    this.name = "MissingApiKeyError";
  }
}

/** Thrown when the call doesn't complete within PREDICTION_TIMEOUT_MS. */
export class PredictionTimeoutError extends Error {
  constructor() {
    super("The prediction call timed out after 60s. Check your connection and try again.");
    this.name = "PredictionTimeoutError";
  }
}

export interface PredictionResult {
  predictions: RiskPrediction[];
  usage: TokenUsage;
}

/**
 * Runs the single prediction call. `userApiKey` (BYOK, entered in the
 * browser) takes priority when present; otherwise falls back to the
 * server's ANTHROPIC_API_KEY env var. Neither present -> MissingApiKeyError,
 * so callers can prompt for a key instead of attempting the call.
 *
 * Bounded by a hard 60s timeout so a stalled network call can never hang a
 * caller forever. `externalSignal` (e.g. a Route Handler's request.signal)
 * is forwarded so a client-initiated cancel actually aborts the in-flight
 * request to Anthropic, not just the UI's wait for it.
 */
export async function predictRisk(
  userApiKey?: string,
  externalSignal?: AbortSignal,
): Promise<PredictionResult> {
  const apiKey = userApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PREDICTION_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const provider = createAnthropic({ apiKey });
    const { output, usage } = await generateText({
      model: provider("claude-sonnet-5"),
      output: Output.object({ schema: predictionSchema }),
      prompt: buildPrompt(CURRICULUM, STUDENT),
      abortSignal: controller.signal,
    });
    return {
      predictions: output.predictions,
      usage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
    };
  } catch (error) {
    if (timedOut) throw new PredictionTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}
