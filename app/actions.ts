"use server";

import { MissingApiKeyError, predictRisk } from "@/lib/predict";
import type { RiskPrediction } from "@/lib/types";

export type PredictResult =
  | { ok: true; predictions: RiskPrediction[] }
  | { ok: false; kind: "missing-key" | "error"; message: string };

/**
 * Client-triggered entry point for BYOK: re-runs the prediction call with
 * a key typed in the browser. Returns a discriminated result instead of
 * throwing, since Server Action errors are sanitized across the
 * client/server boundary in production and would lose the missing-key
 * vs. call-failed distinction.
 */
export async function runPrediction(apiKey: string): Promise<PredictResult> {
  try {
    const predictions = await predictRisk(apiKey);
    return { ok: true, predictions };
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return { ok: false, kind: "missing-key", message: error.message };
    }
    return {
      ok: false,
      kind: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
