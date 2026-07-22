import type { StudentProfile } from "./types";

/**
 * One synthetic sample student with evidence-tagged performance history.
 *
 * Several topics deliberately have no entry at all (untested) — those are
 * exactly the topics predict.ts must reason about using only upstream
 * prerequisite evidence, which is the core "predict what's next" behavior
 * this app demonstrates. Some tested topics have a score but no mistake
 * tags, which should yield lower prediction confidence than topics with
 * detailed mistake evidence.
 */
export const STUDENT: StudentProfile = {
  name: "Jordan M.",
  grade: "9th Grade, Algebra 1",
  history: [
    { topic: "Whole Number Operations", score: 92, mistakes: [] },
    {
      topic: "Integer Operations",
      score: 74,
      mistakes: ["sign error on negative subtraction"],
    },
    { topic: "Order of Operations", score: 88, mistakes: [] },
    {
      topic: "Fractions",
      score: 58,
      mistakes: [
        "forgot common denominator",
        "incorrect simplification",
        "sign error",
      ],
    },
    {
      topic: "Decimals",
      score: 81,
      mistakes: ["misplaced decimal point when multiplying"],
    },
    {
      topic: "Ratios and Proportions",
      score: 66,
      mistakes: [
        "cross-multiplied incorrectly",
        "set up proportion with mismatched units",
      ],
    },
    {
      topic: "Variables and Expressions",
      score: 70,
      mistakes: [
        "substituted value before simplifying",
        "dropped negative sign while distributing",
      ],
    },
    {
      topic: "Combining Like Terms",
      score: 63,
      mistakes: [
        "combined unlike terms (x and x^2)",
        "sign error when subtracting terms",
      ],
    },
    {
      topic: "Solving One-Step Equations",
      score: 79,
      mistakes: ["forgot to apply operation to both sides"],
    },
    {
      topic: "Solving Multi-Step Equations",
      score: 51,
      mistakes: [
        "distributed incorrectly",
        "combined terms on wrong side of the equation",
        "sign error isolating the variable",
      ],
    },
    { topic: "The Coordinate Plane", score: 85, mistakes: [] },
  ],
};
