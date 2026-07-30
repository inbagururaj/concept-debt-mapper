import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCurriculum } from "@/lib/graph-builder";
import { MissingApiKeyError } from "@/lib/predict";
import type { TokenUsage, Topic } from "@/lib/types";

export type GenerateGraphResponse =
  | { ok: true; curriculum: Topic[]; usage: TokenUsage }
  | { ok: false; kind: "missing-key" | "error"; message: string };

const bodySchema = z.object({
  apiKey: z.string().optional(),
  topics: z.array(z.string().min(1)).min(1),
});

/**
 * Generates a prerequisite graph for an arbitrary set of topics (one Claude
 * call) — the subject-agnostic counterpart to lib/curriculum.ts, used only
 * by the "upload your own" data-source path in Dashboard.
 */
export async function POST(request: Request): Promise<NextResponse<GenerateGraphResponse>> {
  let apiKey: string | undefined;
  let topics: string[];
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, kind: "error", message: "Malformed request body." },
        { status: 400 },
      );
    }
    apiKey = parsed.data.apiKey;
    topics = parsed.data.topics;
  } catch {
    return NextResponse.json(
      { ok: false, kind: "error", message: "Malformed request body." },
      { status: 400 },
    );
  }

  try {
    const { curriculum, usage } = await generateCurriculum(topics, apiKey, request.signal);
    return NextResponse.json({ ok: true, curriculum, usage });
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return NextResponse.json(
        { ok: false, kind: "missing-key", message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
