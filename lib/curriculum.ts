import type { Topic } from "./types";

/**
 * Hardcoded, manually curated Algebra 1 prerequisite graph.
 *
 * This is intentionally NOT AI-generated. A hallucinated or structurally
 * wrong edge here (e.g. claiming "Factoring Quadratics" depends on
 * "Decimals") would undermine every downstream prediction, since the LLM
 * reasoning in predict.ts treats this graph as ground truth. The shape
 * ({ topic, prerequisites }[]) is deliberately plain, static JSON so it can
 * be reviewed line-by-line by a human curriculum expert.
 *
 * Scaling note: this same shape is what an AI-assisted graph generator would
 * need to produce for other curricula (e.g. Geometry, Algebra 2) — a future
 * build could add a generation + human-review pipeline that outputs this
 * exact structure. For this build, it ships hardcoded and reviewed.
 */
export const CURRICULUM: Topic[] = [
  { topic: "Whole Number Operations", prerequisites: [] },
  { topic: "Integer Operations", prerequisites: ["Whole Number Operations"] },
  { topic: "Order of Operations", prerequisites: ["Whole Number Operations"] },
  { topic: "Fractions", prerequisites: ["Whole Number Operations"] },
  { topic: "Decimals", prerequisites: ["Whole Number Operations"] },
  { topic: "Ratios and Proportions", prerequisites: ["Fractions"] },
  {
    topic: "Variables and Expressions",
    prerequisites: ["Order of Operations", "Integer Operations"],
  },
  { topic: "Combining Like Terms", prerequisites: ["Variables and Expressions"] },
  {
    topic: "Solving One-Step Equations",
    prerequisites: ["Integer Operations", "Variables and Expressions"],
  },
  {
    topic: "Solving Multi-Step Equations",
    prerequisites: ["Solving One-Step Equations", "Combining Like Terms"],
  },
  { topic: "Solving Inequalities", prerequisites: ["Solving Multi-Step Equations"] },
  { topic: "The Coordinate Plane", prerequisites: ["Integer Operations"] },
  {
    topic: "Linear Equations (Slope-Intercept Form)",
    prerequisites: ["Solving Multi-Step Equations", "The Coordinate Plane"],
  },
  {
    topic: "Graphing Linear Equations",
    prerequisites: ["Linear Equations (Slope-Intercept Form)"],
  },
  {
    topic: "Systems of Linear Equations",
    prerequisites: ["Graphing Linear Equations", "Solving Multi-Step Equations"],
  },
  { topic: "Exponent Rules", prerequisites: ["Variables and Expressions"] },
  {
    topic: "Polynomials: Adding and Subtracting",
    prerequisites: ["Combining Like Terms", "Exponent Rules"],
  },
  {
    topic: "Polynomials: Multiplying",
    prerequisites: ["Polynomials: Adding and Subtracting"],
  },
  { topic: "Factoring Quadratics", prerequisites: ["Polynomials: Multiplying"] },
  {
    topic: "Quadratic Equations",
    prerequisites: ["Factoring Quadratics", "Solving Multi-Step Equations"],
  },
];
