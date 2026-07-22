import type { StudentProfile, Topic } from "@/lib/types";

interface ScoreOverviewProps {
  student: StudentProfile;
  curriculum: Topic[];
}

export function ScoreOverview({ student, curriculum }: ScoreOverviewProps) {
  const untestedCount = curriculum.length - student.history.length;

  return (
    <div className="rounded-lg border border-(--line) bg-(--paper) p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-semibold text-(--ink)">
          {student.name} — performance history
        </h2>
        <p className="font-mono text-[11px] text-(--ink-muted)">
          {student.grade} · {student.history.length} topics tested ·{" "}
          {untestedCount} untested
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--line) text-left text-(--ink-muted)">
              <th className="py-1.5 pr-4 font-sans font-medium">Topic</th>
              <th className="py-1.5 pr-4 font-sans font-medium">Score</th>
              <th className="py-1.5 font-sans font-medium">Tagged mistakes</th>
            </tr>
          </thead>
          <tbody>
            {student.history.map((entry) => (
              <tr key={entry.topic} className="border-b border-(--line)/60 align-top">
                <td className="py-2 pr-4 font-sans text-(--ink)">{entry.topic}</td>
                <td className="py-2 pr-4 font-mono text-(--ink)">{entry.score}/100</td>
                <td className="py-2 font-mono text-xs text-(--ink-muted)">
                  {entry.mistakes.length > 0
                    ? entry.mistakes.join("; ")
                    : "none recorded"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
