"use client";

import { useRef } from "react";
import type { StudentProfile } from "@/lib/types";

export type DataSource = "demo" | "upload";

interface DataSourceBarProps {
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  onFileSelected: (file: File) => void;
  uploadedStudent: StudentProfile | null;
  csvError?: string | null;
  csvWarning?: string | null;
  onRun: () => void;
  canRun: boolean;
  loading: boolean;
  demoStudentName: string;
}

/**
 * Lets the demo run against real (uploaded) student data instead of the
 * hardcoded Jordan M. sample. Only the performance data source changes —
 * the curriculum graph and prediction/remediation logic are untouched;
 * this component only produces a StudentProfile and hands it to the same
 * pipeline via Dashboard's onRun.
 */
export function DataSourceBar({
  dataSource,
  onDataSourceChange,
  onFileSelected,
  uploadedStudent,
  csvError,
  csvWarning,
  onRun,
  canRun,
  loading,
  demoStudentName,
}: DataSourceBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-(--line)/60 bg-(--paper) p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          Data source
        </h2>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => onDataSourceChange("demo")}
          className={`rounded border px-2.5 py-1.5 cursor-pointer ${
            dataSource === "demo"
              ? "border-(--pine) bg-(--pine) text-(--paper)"
              : "border-(--line) text-(--ink-muted)"
          }`}
        >
          Use demo data ({demoStudentName})
        </button>
        <button
          type="button"
          onClick={() => onDataSourceChange("upload")}
          className={`rounded border px-2.5 py-1.5 cursor-pointer ${
            dataSource === "upload"
              ? "border-(--pine) bg-(--pine) text-(--paper)"
              : "border-(--line) text-(--ink-muted)"
          }`}
        >
          Upload your own
        </button>
      </div>

      {dataSource === "upload" && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-(--ink-muted)">
            CSV with header <code className="font-mono">student,topic,score,mistakes</code> — one
            row per topic, mistakes separated by <code className="font-mono">;</code>. Topic
            names must match the Algebra 1 curriculum.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelected(file);
                e.target.value = "";
              }}
              className="hidden"
              id="csv-upload-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-(--line) px-2.5 py-1.5 font-mono text-xs text-(--ink) cursor-pointer"
            >
              choose CSV file
            </button>
            {uploadedStudent && (
              <span className="font-mono text-[11px] text-(--pine)">
                loaded: {uploadedStudent.name} ({uploadedStudent.history.length} topics)
              </span>
            )}
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun || loading}
              className="rounded bg-(--pine) px-3 py-1.5 font-mono text-xs text-(--paper) disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "running…" : "run prediction on this data"}
            </button>
          </div>
          {csvError && (
            <p className="font-mono text-[11px] text-(--rust)/85">{csvError}</p>
          )}
          {!csvError && csvWarning && (
            <p className="font-mono text-[11px] text-(--ink-muted)">{csvWarning}</p>
          )}
        </div>
      )}
    </div>
  );
}
