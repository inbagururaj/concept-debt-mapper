"use client";

import { useRef } from "react";
import type { StudentProfile } from "@/lib/types";

export type DataSource = "demo" | "upload";

interface DataSourceBarProps {
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  onFileSelected: (file: File) => void;
  /** Name of the currently-selected file, shown before it's been parsed. */
  fileName: string | null;
  /** Set once the file has actually been parsed (by the AI, on run) — null before then, even if a file is selected. */
  parsedStudent: StudentProfile | null;
  csvError?: string | null;
  onRun: () => void;
  canRun: boolean;
  loading: boolean;
  runLabel: string;
  demoStudentName: string;
}

/**
 * Lets the demo run against real (uploaded) student data instead of the
 * hardcoded Jordan M. sample, for any subject and any reasonable gradebook
 * layout — not just Algebra 1 and not a fixed column format. Column
 * naming/order isn't validated here: the raw file text is handed to
 * Dashboard's onRun, which sends it to /api/parse-upload — one combined
 * call that both interprets the file's structure and generates a
 * prerequisite graph for whatever topics it finds. This component doesn't
 * know the file's actual content until that call comes back.
 */
export function DataSourceBar({
  dataSource,
  onDataSourceChange,
  onFileSelected,
  fileName,
  parsedStudent,
  csvError,
  onRun,
  canRun,
  loading,
  runLabel,
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
            One row per topic. Column names/order flexible (e.g. name/student, score/grade).
            Any subject — topics and prerequisites inferred automatically.
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
            {parsedStudent ? (
              <span className="font-mono text-[11px] text-(--pine)">
                parsed: {parsedStudent.name} ({parsedStudent.history.length} topics)
              </span>
            ) : (
              fileName && (
                <span className="font-mono text-[11px] text-(--ink-muted)">{fileName}</span>
              )
            )}
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun || loading}
              className="rounded bg-(--pine) px-3 py-1.5 font-mono text-xs text-(--paper) disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {runLabel}
            </button>
          </div>
          {csvError && (
            <p className="font-mono text-[11px] text-(--rust)/85">{csvError}</p>
          )}
        </div>
      )}
    </div>
  );
}
