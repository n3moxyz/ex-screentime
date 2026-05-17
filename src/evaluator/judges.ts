import type { CriterionId, JudgeId } from "./types";

export interface JudgeLens {
  id: JudgeId;
  name: string;
  role: string;
  homeDimension: CriterionId;
  color: string;
  marker: string;
  bias: Record<CriterionId, number>;
  preferences: string[];
  redFlag: string;
  style: string;
}

export const JUDGES: Record<JudgeId, JudgeLens> = {
  "sam-altman": {
    id: "sam-altman",
    name: "Sam Altman",
    role: "OpenAI CEO / startup scale lens",
    homeDimension: "impact",
    color: "#9f5f24",
    marker: "SA",
    bias: {
      impact: 1.3,
      technical_execution: 0.9,
      originality: 1.1,
      demo_quality: 0.95,
      harness_agent_engineering: 1,
    },
    preferences: [
      "Large-market or behavior-change thesis",
      "Obvious user pain and urgency",
      "Path from demo to durable product",
    ],
    redFlag: "Technically interesting work with an unclear or low-stakes problem.",
    style: "Rewards ambition, clarity of need, and leverage.",
  },
  "andrej-karpathy": {
    id: "andrej-karpathy",
    name: "Andrej Karpathy",
    role: "AI engineer / systems clarity lens",
    homeDimension: "technical_execution",
    color: "#286a67",
    marker: "AK",
    bias: {
      impact: 0.85,
      technical_execution: 1.35,
      originality: 0.95,
      demo_quality: 1,
      harness_agent_engineering: 1.1,
    },
    preferences: [
      "Readable architecture",
      "Tests, type checks, deterministic fixtures",
      "Clear separation between evaluator logic and UI",
    ],
    redFlag: "Brittle magic or untested glue that hides whether the system works.",
    style: "Rewards simple, inspectable engineering.",
  },
  "ilya-sutskever": {
    id: "ilya-sutskever",
    name: "Ilya Sutskever",
    role: "AI research / deep originality lens",
    homeDimension: "originality",
    color: "#6f5d91",
    marker: "IS",
    bias: {
      impact: 0.95,
      technical_execution: 1,
      originality: 1.35,
      demo_quality: 0.85,
      harness_agent_engineering: 1.15,
    },
    preferences: [
      "Non-obvious insight about agents or evaluation",
      "Mechanism that improves with iteration",
      "Depth beyond the UI surface",
    ],
    redFlag: "Polished but conceptually derivative work.",
    style: "Rewards depth, recursive evaluation, and new framing.",
  },
  "brian-chesky": {
    id: "brian-chesky",
    name: "Brian Chesky",
    role: "Founder / product storytelling lens",
    homeDimension: "demo_quality",
    color: "#b54632",
    marker: "BC",
    bias: {
      impact: 1.15,
      technical_execution: 0.95,
      originality: 1,
      demo_quality: 1.35,
      harness_agent_engineering: 0.9,
    },
    preferences: [
      "Clear first 10 seconds",
      "Strong narrative arc through the demo",
      "UI that makes value obvious without explanation",
    ],
    redFlag: "Strong backend or harness with a confusing user-facing experience.",
    style: "Rewards emotional clarity, product taste, and memorable flow.",
  },
  "harrison-chase": {
    id: "harrison-chase",
    name: "Harrison Chase",
    role: "LangChain founder / agent workflow lens",
    homeDimension: "harness_agent_engineering",
    color: "#315c9a",
    marker: "HC",
    bias: {
      impact: 0.95,
      technical_execution: 1.1,
      originality: 1,
      demo_quality: 0.85,
      harness_agent_engineering: 1.4,
    },
    preferences: [
      "Explicit agent loop design",
      "Tool use, logging, task decomposition, and recovery behavior",
      "Evidence that the system can run autonomously and improve through feedback",
    ],
    redFlag: "Agentic claims without prompt, logs, task graph, or verification evidence.",
    style: "Rewards autonomous workflow design and operational rigor.",
  },
};

export const PHASE_ZERO_PANEL: JudgeId[] = ["harrison-chase", "brian-chesky"];

export const TRACK_PRESETS: Record<string, JudgeId[]> = {
  "Phase 0 Split Demo": ["harrison-chase", "brian-chesky"],
  "Harness / Skills Track": [
    "harrison-chase",
    "andrej-karpathy",
    "ilya-sutskever",
    "sam-altman",
    "brian-chesky",
  ],
  "Overall Ralphthon": [
    "sam-altman",
    "andrej-karpathy",
    "ilya-sutskever",
    "brian-chesky",
    "harrison-chase",
  ],
  "Impact Track": [
    "sam-altman",
    "brian-chesky",
    "ilya-sutskever",
    "andrej-karpathy",
    "harrison-chase",
  ],
};
