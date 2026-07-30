import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MissingApiKeyError, PredictionTimeoutError } from "./predict";
import type { TokenUsage, Topic } from "./types";

const GRAPH_TIMEOUT_MS = 60_000;

const graphSchema = z.object({
  topics: z.array(
    z.object({
      topic: z.string(),
      prerequisites: z.array(z.string()),
    }),
  ),
});

export interface GraphResult {
  curriculum: Topic[];
  usage: TokenUsage;
}

/**
 * Infers a prerequisite graph for an arbitrary set of topics via one Claude
 * call — the subject-agnostic counterpart to the hardcoded, human-reviewed
 * CURRICULUM used for the demo path. Used only for uploaded CSV data, where
 * there is no pre-built graph to reason against.
 *
 * The model's output is not trusted as-is: topics are re-keyed onto the
 * exact input strings (so predict.ts's exact-match evidence lookup can't
 * silently drop a topic over a casing/whitespace drift), prerequisites
 * outside the input set or self-referencing are dropped, and any cycle the
 * model produces is broken — computeGraphLayout throws on a cycle, and a
 * generated graph is exactly the kind of input that isn't guaranteed
 * acyclic just because we asked nicely.
 */
export async function generateCurriculum(
  topics: string[],
  userApiKey?: string,
  externalSignal?: AbortSignal,
): Promise<GraphResult> {
  const apiKey = userApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, GRAPH_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const provider = createAnthropic({ apiKey });
    const { output, usage } = await generateText({
      model: provider("claude-sonnet-5"),
      output: Output.object({ schema: graphSchema }),
      prompt: buildGraphPrompt(topics),
      abortSignal: controller.signal,
    });

    const curriculum = reconcileGraph(topics, output.topics);

    return {
      curriculum,
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

function buildGraphPrompt(topics: string[]): string {
  const list = topics.map((t) => `- "${t}"`).join("\n");
  return `You are building a prerequisite dependency graph for a course. Below is the full list of topics taught in this course (subject unknown — infer it, and the likely teaching order, from the topic names themselves).

TOPICS:
${list}

TASK:
For every topic above, list which OTHER topics from this same list a student must understand first. Base this on standard pedagogical ordering for whatever subject these topics belong to.

Rules:
- Return every topic in the list exactly once, using its exact given name and spelling.
- "prerequisites" may only contain other topic names from the list above — never invent a topic that isn't listed, and never list a topic as its own prerequisite.
- Foundational topics (nothing here depends on prior knowledge from this list) get an empty prerequisites array.
- The graph must be acyclic: if two topics seem mutually dependent, pick the more foundational one and make it the prerequisite, not both ways.
- Prefer direct prerequisites only (the immediate topic(s) a student needs, not everything transitively behind it).`;
}

/**
 * Re-keys the model's output onto the exact input topic strings and strips
 * anything that isn't a valid same-set, non-self prerequisite. Then breaks
 * any remaining cycle by repeatedly clearing the prerequisites of whatever
 * topic is left with unresolved dependencies — a blunt but safe fallback
 * that guarantees computeGraphLayout (which throws on a cycle) never sees
 * one, at the cost of occasionally under-connecting a topic rather than
 * risk taking down the graph render entirely.
 */
function reconcileGraph(
  topics: string[],
  modelTopics: { topic: string; prerequisites: string[] }[],
): Topic[] {
  const validTopics = new Set(topics);
  const byNormalized = new Map(
    modelTopics.map((t) => [t.topic.trim().toLowerCase(), t.prerequisites]),
  );

  const draft: Topic[] = topics.map((topic) => {
    const prereqs = byNormalized.get(topic.trim().toLowerCase()) ?? [];
    const cleaned = [
      ...new Set(
        prereqs.filter((p) => validTopics.has(p) && p !== topic),
      ),
    ];
    return { topic, prerequisites: cleaned };
  });

  return breakCycles(draft);
}

function breakCycles(curriculum: Topic[]): Topic[] {
  const byTopic = new Set(curriculum.map((t) => t.topic));

  // Kahn's algorithm: repeatedly resolve topics whose prerequisites are all
  // already resolved. Anything left when nothing new resolves in a full
  // pass sits in a cycle — clear those topics' prerequisites so they
  // become roots instead of crashing the layered layout.
  const resolved = new Set<string>(
    curriculum.filter((t) => t.prerequisites.length === 0).map((t) => t.topic),
  );

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const t of curriculum) {
      if (resolved.has(t.topic)) continue;
      if (t.prerequisites.every((p) => resolved.has(p) || !byTopic.has(p))) {
        resolved.add(t.topic);
        progressed = true;
      }
    }
  }

  return curriculum.map((t) =>
    resolved.has(t.topic) ? t : { topic: t.topic, prerequisites: [] },
  );
}
