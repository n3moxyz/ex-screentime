import type { CriterionId, StageId } from "./types";

export const STAGES: Array<{ id: StageId; label: string }> = [
  { id: "intake", label: "Repo intake" },
  { id: "track_panel", label: "Track and panel" },
  { id: "stack_detection", label: "Stack detection" },
  { id: "documentation_review", label: "Documentation review" },
  { id: "prompt_discovery", label: "Prompt discovery" },
  { id: "structure_inspection", label: "Structure inspection" },
  { id: "verification", label: "Verification checks" },
  { id: "scoring", label: "Rubric scoring" },
  { id: "panel_interpretation", label: "Panel interpretation" },
  { id: "report_generation", label: "Report generation" },
];

export const RUBRIC: Array<{
  id: CriterionId;
  label: string;
  max: number;
  short: string;
  clauses: string[];
}> = [
  {
    id: "impact",
    label: "Impact",
    max: 20,
    short: "Meaningful problem, clear audience, and practical value.",
    clauses: [
      "Clear problem statement",
      "Clear target user",
      "Useful workflow",
      "Practical value beyond a toy demo",
    ],
  },
  {
    id: "technical_execution",
    label: "Technical Execution",
    max: 20,
    short: "Competent implementation with reproducible verification.",
    clauses: [
      "Install/build/test commands exist",
      "Build succeeds",
      "Tests or deterministic checks pass",
      "Architecture is coherent and inspectable",
    ],
  },
  {
    id: "originality",
    label: "Originality",
    max: 15,
    short: "Distinctive concept or interaction model.",
    clauses: [
      "Novel framing",
      "Non-obvious assessment model",
      "Creative use of agents or evaluation",
      "Differentiated from generic dashboards",
    ],
  },
  {
    id: "demo_quality",
    label: "Demo Quality",
    max: 15,
    short: "A short judging-window story that lands without narration.",
    clauses: [
      "Clear first screen",
      "Smooth primary demo flow",
      "Seeded data or fixtures",
      "Judge-facing report",
    ],
  },
  {
    id: "harness_agent_engineering",
    label: "Harness / Agent Engineering",
    max: 30,
    short: "Autonomous workflow rigor, evidence logging, and recovery design.",
    clauses: [
      "Spec clarity",
      "Autonomous prompt quality",
      "Task decomposition",
      "Build/test loop evidence",
      "Failure recovery",
      "Evidence logging",
      "Submission/report readiness",
    ],
  },
];

export const RUBRIC_BY_ID = Object.fromEntries(RUBRIC.map((item) => [item.id, item])) as Record<
  CriterionId,
  (typeof RUBRIC)[number]
>;
