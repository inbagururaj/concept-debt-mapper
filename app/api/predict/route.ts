import { NextResponse } from "next/server";
import { z } from "zod";
import { MissingApiKeyError, predictRisk } from "@/lib/predict";
import type { RiskPrediction, TokenUsage } from "@/lib/types";

export type PredictResponse =
  | { ok: true; predictions: RiskPrediction[]; usage: TokenUsage }
  | { ok: false; kind: "missing-key" | "error"; message: string };

const studentSchema = z.object({
  name: z.string().min(1),
  grade: z.string().min(1),
  history: z.array(
    z.object({
      topic: z.string().min(1),
      score: z.number().min(0).max(100),
      mistakes: z.array(z.string()),
    }),
  ),
});

const curriculumSchema = z.array(
  z.object({
    topic: z.string().min(1),
    prerequisites: z.array(z.string()),
  }),
);

/**
 * Plain Route Handler (not a Server Action) so the client can hold a real
 * AbortController tied to `fetch`'s `signal` — aborting it cancels the
 * actual in-flight HTTP request, and `request.signal` here forwards that
 * cancellation into the Anthropic call via predictRisk's externalSignal.
 */
export async function POST(request: Request): Promise<NextResponse<PredictResponse>> {
  let apiKey: string | undefined;
  let student: z.infer<typeof studentSchema> | undefined;
  let curriculum: z.infer<typeof curriculumSchema> | undefined;
  try {
    const body = (await request.json()) as {
      apiKey?: unknown;
      student?: unknown;
      curriculum?: unknown;
    };
    apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
    if (body.student !== undefined) {
      const parsed = studentSchema.safeParse(body.student);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, kind: "error", message: "Malformed student data." },
          { status: 400 },
        );
      }
      student = parsed.data;
    }
    if (body.curriculum !== undefined) {
      const parsed = curriculumSchema.safeParse(body.curriculum);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, kind: "error", message: "Malformed curriculum data." },
          { status: 400 },
        );
      }
      curriculum = parsed.data;
    }
  } catch {
    return NextResponse.json(
      { ok: false, kind: "error", message: "Malformed request body." },
      { status: 400 },
    );
  }

  try {
    const { predictions, usage } = await predictRisk(apiKey, request.signal, student, curriculum);
    return NextResponse.json({ ok: true, predictions, usage });
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
