import type { StudentProfile } from "./types";

/**
 * Parses one CSV row honoring RFC-4180-style quoting (commas and escaped
 * `""` inside quoted fields). No external dependency — the format this app
 * accepts is deliberately narrow (4 fixed columns), so a full CSV library
 * would be overkill.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

const EXPECTED_HEADERS = ["student", "topic", "score", "mistakes"];

export interface CsvParseResult {
  student?: StudentProfile;
  error?: string;
}

/**
 * Parses uploaded student performance data for any subject. Expected
 * header row:
 *   student,topic,score,mistakes
 * `mistakes` is a single field with individual mistakes separated by `;`
 * (empty for none). One row per topic; `student` must be the same value on
 * every row (used as the profile name). Topic names are not validated
 * against any fixed curriculum — the caller (Dashboard, via
 * graph-builder.ts) generates a prerequisite graph for whatever distinct
 * topics show up here.
 */
export function parseStudentCsv(raw: string): CsvParseResult {
  const lines = raw
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { error: "The file is empty." };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = EXPECTED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      error: `Missing column(s): ${missing.join(", ")}. Expected header: student,topic,score,mistakes`,
    };
  }
  if (lines.length === 1) {
    return { error: "No data rows found below the header." };
  }

  const idx = {
    student: header.indexOf("student"),
    topic: header.indexOf("topic"),
    score: header.indexOf("score"),
    mistakes: header.indexOf("mistakes"),
  };

  let studentName: string | null = null;
  const history: StudentProfile["history"] = [];
  const seenTopics = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const fields = parseCsvLine(lines[i]);
    if (fields.length < EXPECTED_HEADERS.length) {
      return { error: `Row ${rowNum}: expected ${EXPECTED_HEADERS.length} columns, got ${fields.length}.` };
    }

    const name = fields[idx.student];
    const topic = fields[idx.topic];
    const scoreRaw = fields[idx.score];
    const mistakesRaw = fields[idx.mistakes];

    if (!name) return { error: `Row ${rowNum}: "student" is empty.` };
    if (!topic) return { error: `Row ${rowNum}: "topic" is empty.` };

    if (studentName === null) {
      studentName = name;
    } else if (name !== studentName) {
      return {
        error: `Row ${rowNum}: student name "${name}" differs from "${studentName}" — one CSV must describe one student.`,
      };
    }

    const score = Number(scoreRaw);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return { error: `Row ${rowNum}: "score" must be a number between 0 and 100, got "${scoreRaw}".` };
    }

    if (seenTopics.has(topic)) {
      return { error: `Row ${rowNum}: duplicate entry for topic "${topic}".` };
    }
    seenTopics.add(topic);

    const mistakes = mistakesRaw
      .split(";")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    history.push({ topic, score, mistakes });
  }

  if (!studentName) {
    return { error: "No valid data rows found." };
  }

  return {
    student: {
      name: studentName,
      grade: "Uploaded data",
      history,
    },
  };
}
