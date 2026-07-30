import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MissingApiKeyError, PredictionTimeoutError } from "./predict";
import type { StudentProfile, TokenUsage, Topic } from "./types";

const PARSE_TIMEOUT_MS = 60_000;
// Keeps a runaway/huge upload from turning into an oversized, expensive
// prompt — checked before the call is ever made.
const MAX_CSV_CHARS = 20_000;

const uploadSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("parsed"),
    studentName: z.string().min(1),
    records: z
      .array(
        z.object({
          topic: z.string().min(1),
          score: z.number().min(0).max(100),
          mistakes: z.array(z.string()),
        }),
      )
      .min(1),
    curriculum: z.array(
      z.object({
        topic: z.string().min(1),
        prerequisites: z.array(z.string()),
      }),
    ),
  }),
  z.object({
    status: z.literal("unparseable"),
    reason: z.string().min(1),
  }),
]);

export type UploadParseResult =
  | { ok: true; student: StudentProfile; curriculum: Topic[]; usage: TokenUsage }
  | { ok: false; reason: string; usage: TokenUsage };

/**
 * One combined Claude call for the "upload your own" path: interprets a
 * loosely-formatted gradebook-style CSV (any column naming/order — no
 * fixed header contract) into structured student performance records AND
 * generates a prerequisite graph for whatever topics turn up, in a single
 * structured-output response. Deliberately not two calls (extract, then
 * graph) — the topic list the graph needs only exists once extraction has
 * happened, so splitting them would mean either a second round trip or
 * re-sending the graph topics back through another prompt; one call with
 * both fields in the schema gets both for the price of one.
 *
 * The model's output is not trusted as-is for the graph: curriculum
 * entries are re-keyed onto the exact topic strings pulled from `records`
 * (not the graph's own possibly-drifted spelling), so predict.ts's
 * exact-match evidence lookup can't silently drop a topic, and any cycle
 * the model produces is broken — computeGraphLayout throws on a cycle.
 */
export async function parseUploadWithGraph(
  rawCsv: string,
  userApiKey?: string,
  externalSignal?: AbortSignal,
): Promise<UploadParseResult> {
  if (rawCsv.length > MAX_CSV_CHARS) {
    return {
      ok: false,
      reason: `File is too large (${rawCsv.length.toLocaleString()} characters) — keep uploads under ${MAX_CSV_CHARS.toLocaleString()} characters.`,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const apiKey = userApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PARSE_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const provider = createAnthropic({ apiKey });
    const { output, usage } = await generateText({
      model: provider("claude-sonnet-5"),
      output: Output.object({ schema: uploadSchema }),
      prompt: buildUploadPrompt(rawCsv),
      abortSignal: controller.signal,
    });

    const tokenUsage: TokenUsage = {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    };

    if (output.status === "unparseable") {
      return { ok: false, reason: output.reason, usage: tokenUsage };
    }

    const { student, curriculum } = reconcile(output);
    return { ok: true, student, curriculum, usage: tokenUsage };
  } catch (error) {
    if (timedOut) throw new PredictionTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

function buildUploadPrompt(rawCsv: string): string {
  return `You are given the raw contents of a file a user uploaded, claiming it holds one student's performance data across topics in some course. Do NOT assume any fixed column names or order — for example the student's name might be under a header like "student", "name", or "learner"; the topic might be "topic", "concept", "unit", or "skill"; the score might be "score", "grade", "percent", or "mastery" (treat it as a 0-100 percentage — if it's a letter grade, convert it: A=95, B=85, C=75, D=65, F=50); "mistakes" might be a free-text sentence, a list, or absent entirely.

RAW FILE CONTENTS:
"""
${rawCsv}
"""

TASK:
1. First decide whether this is genuinely one-student, one-row-per-topic gradebook data. If it isn't — empty, unrelated content, no identifiable topic+score per row, multiple students mixed together with no way to isolate one, etc. — respond with status "unparseable" and a one-sentence, non-technical reason.
2. If it is, extract every real data row into a record: the topic name as written, a 0-100 numeric score (converting letter grades as above), and a "mistakes" array — split any free-text mistake description into short distinct phrases; use an empty array if no mistake information is given for that row. Skip only genuinely blank or repeated-header rows.
3. Also generate a prerequisite graph for the distinct topics you extracted: for each one, list which OTHER extracted topics a student should understand first, based on standard pedagogical ordering for whatever subject you infer these topics belong to from their names. Foundational topics (nothing here depends on prior knowledge from this list) get an empty prerequisites array. Prerequisites may only reference other topics from this same extracted list — never invent one, never list a topic as its own prerequisite. The graph must be acyclic: if two topics seem mutually dependent, pick the more foundational one as the prerequisite, not both ways.
4. Return the student's name as found in the data, or "Uploaded student" if there's no name column at all.`;
}

function reconcile(output: {
  studentName: string;
  records: { topic: string; score: number; mistakes: string[] }[];
  curriculum: { topic: string; prerequisites: string[] }[];
}): { student: StudentProfile; curriculum: Topic[] } {
  // Duplicate topic rows keep only the first occurrence — the model was
  // asked for one row per topic, but a messy source file (or the model
  // itself) can still produce repeats; picking a merge strategy beyond
  // "first wins" isn't worth the complexity here.
  const seen = new Set<string>();
  const history: StudentProfile["history"] = [];
  for (const record of output.records) {
    if (seen.has(record.topic)) continue;
    seen.add(record.topic);
    history.push(record);
  }

  const topics = history.map((h) => h.topic);
  const validTopics = new Set(topics);
  const byNormalized = new Map(
    output.curriculum.map((t) => [t.topic.trim().toLowerCase(), t.prerequisites]),
  );

  const draftCurriculum: Topic[] = topics.map((topic) => {
    const prereqs = byNormalized.get(topic.trim().toLowerCase()) ?? [];
    const cleaned = [...new Set(prereqs.filter((p) => validTopics.has(p) && p !== topic))];
    return { topic, prerequisites: cleaned };
  });

  return {
    student: {
      name: output.studentName,
      grade: "Uploaded data",
      history,
    },
    curriculum: breakCycles(draftCurriculum),
  };
}

/**
 * Kahn's algorithm: repeatedly resolve topics whose prerequisites are all
 * already resolved. Anything left when nothing new resolves in a full pass
 * sits in a cycle — clear those topics' prerequisites so they become roots
 * instead of crashing the layered layout (computeGraphLayout throws on a
 * cycle, and a generated graph isn't guaranteed acyclic just because the
 * prompt asked for it).
 */
function breakCycles(curriculum: Topic[]): Topic[] {
  const byTopic = new Set(curriculum.map((t) => t.topic));

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
