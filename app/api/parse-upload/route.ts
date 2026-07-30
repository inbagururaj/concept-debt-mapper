import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUploadWithGraph } from "@/lib/graph-builder";
import { MissingApiKeyError } from "@/lib/predict";
import type { StudentProfile, TokenUsage, Topic } from "@/lib/types";

export type ParseUploadResponse =
  | { ok: true; student: StudentProfile; curriculum: Topic[]; usage: TokenUsage }
  | { ok: false; kind: "missing-key" | "unparseable" | "error"; message: string; usage?: TokenUsage };

const bodySchema = z.object({
  apiKey: z.string().optional(),
  csv: z.string().min(1),
});

/**
 * One combined Claude call: interprets a loosely-formatted uploaded CSV
 * into structured student performance data AND generates a prerequisite
 * graph for the topics found, in a single structured-output response. Used
 * only by the "upload your own" data-source path in Dashboard.
 */
export async function POST(request: Request): Promise<NextResponse<ParseUploadResponse>> {
  let apiKey: string | undefined;
  let csv: string;
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
    csv = parsed.data.csv;
  } catch {
    return NextResponse.json(
      { ok: false, kind: "error", message: "Malformed request body." },
      { status: 400 },
    );
  }

  try {
    const result = await parseUploadWithGraph(csv, apiKey, request.signal);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, kind: "unparseable", message: result.reason, usage: result.usage },
        { status: 422 },
      );
    }
    return NextResponse.json({
      ok: true,
      student: result.student,
      curriculum: result.curriculum,
      usage: result.usage,
    });
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
