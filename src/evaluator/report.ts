import { JUDGES } from "./judges";
import { RUBRIC, RUBRIC_BY_ID } from "./rubric";
import {
  getAgreementLevel,
  getCriterionConfidence,
  getCriterionPanelScore,
  getJudgeCriterionScore,
  getPanelSpread,
  getTotalScore,
} from "./reducer";
import type { EvaluationState, FixtureMeta, JudgeId } from "./types";

const fmt = (value: number) => value.toFixed(1);

export const generateReportMarkdown = (
  state: EvaluationState,
  meta: FixtureMeta,
  panel: JudgeId[],
) => {
  const total = getTotalScore(state, panel);
  const hasPanelSplit = Object.values(state.panelSplits).some((split) => split?.meaningful);
  const isLocalStatic = meta.mode === "local-static";
  const strengths = [
    isLocalStatic
      ? "Local Path Mode inspected safe files without executing arbitrary commands."
      : "Replay fixture mode is deterministic and clearly labeled.",
    "Score movement is tied to evidence, confidence, artifact references, and judge lenses.",
    hasPanelSplit
      ? "Meaningful panel disagreement is visible and explained with a resolution note."
      : "Panel consensus is shown explicitly rather than inventing a disagreement.",
  ];
  const weaknesses = isLocalStatic
    ? [
        "Local Path Mode is static-only; documented build or test commands were not executed.",
        "Static inspection can observe files and scripts, but it cannot prove runtime behavior.",
      ]
    : [
        "GitHub URL Mode is intentionally deferred.",
        "Replay fixtures use curated event logs rather than live repo verification.",
      ];
  const missingItems = RUBRIC.flatMap((item) =>
    state.criteria[item.id].missing.map((missing) => ({
      criterion: item.label,
      label: missing.label,
      artifactRef: missing.artifactRef,
    })),
  );

  const lines = [
    "# Ralph Ledger Judge Report",
    "",
    `Fixture: ${meta.name}`,
    `Track: ${meta.track}`,
    `Mode: ${meta.mode}`,
    ...(meta.sourcePath ? [`Source path: ${meta.sourcePath}`] : []),
    `Panel: ${panel.map((judge) => JUDGES[judge].name).join(", ")}`,
    `Final score: ${fmt(total)} / 100`,
    "",
    "## Executive Summary",
    meta.summary,
    "",
    isLocalStatic
      ? "Ralph Ledger evaluated the submission through read-only static inspection. It inspected safe documentation, manifests, scripts, fixtures, and source layout, then emitted the same structured events used by the replay UI. It did not execute repo commands."
      : "Ralph Ledger evaluated the submission by replaying a structured evidence log through the same scoring state used by the live UI. Every visible score movement retains its reason, confidence, artifact reference, rubric clause, and judge lens.",
    "",
    "## Selected Panel",
  ];

  panel.forEach((judge) => {
    lines.push(
      `- ${JUDGES[judge].name}: ${RUBRIC_BY_ID[JUDGES[judge].homeDimension].label} lens`,
    );
  });

  lines.push(
    "",
    "## Scorecard",
  );

  RUBRIC.forEach((item) => {
    const criterion = state.criteria[item.id];
    const spread = getPanelSpread(criterion, panel);
    lines.push(
      `- ${item.label}: ${fmt(getCriterionPanelScore(criterion, panel))}/${item.max} ` +
        `(confidence ${Math.round(getCriterionConfidence(criterion) * 100)}%, ` +
        `agreement ${getAgreementLevel(criterion, panel)}, spread ${fmt(spread.min)}-${fmt(
          spread.max,
        )})`,
    );
  });

  lines.push("", "## Strengths");
  strengths.forEach((strength) => lines.push(`- ${strength}`));
  lines.push("", "## Weaknesses / Known Limits");
  weaknesses.forEach((weakness) => lines.push(`- ${weakness}`));

  lines.push("", "## Missing Evidence");
  if (missingItems.length) {
    missingItems.forEach((item) =>
      lines.push(`- ${item.criterion}: ${item.label} (${item.artifactRef})`),
    );
  } else {
    lines.push("- No explicit missing-evidence deductions were recorded.");
  }

  lines.push("", "## Confidence Notes");
  RUBRIC.forEach((item) => {
    lines.push(
      `- ${item.label}: ${Math.round(
        getCriterionConfidence(state.criteria[item.id]) * 100,
      )}% average confidence`,
    );
  });

  lines.push("", "## Evidence Trail");
  RUBRIC.forEach((item) => {
    const criterion = state.criteria[item.id];
    lines.push("", `### ${item.label}`);
    criterion.changes.forEach((change) => {
      lines.push(
        `- ${JUDGES[change.judge].name}: ${change.delta > 0 ? "+" : ""}${fmt(
          change.delta,
        )} — ${change.reason} (${change.evidenceKind}, ${change.artifactRef}, ${
          RUBRIC_BY_ID[change.criterion].label
        })`,
      );
    });
  });

  lines.push("", "## Panel Disagreement");
  if (hasPanelSplit) {
    Object.values(state.panelSplits).forEach((split) => {
      if (!split) return;
      lines.push(
        `- ${RUBRIC_BY_ID[split.criterion].label}: ${split.consensus} consensus. ${
          JUDGES[split.highestJudge].name
        } highest because ${split.highestReason.toLowerCase()} ${
          JUDGES[split.lowestJudge].name
        } lowest because ${split.lowestReason.toLowerCase()} ${split.resolutionNote}`,
      );
    });
  } else {
    lines.push("- No meaningful panel split was detected for this session.");
  }

  lines.push("", "## Suggested Improvements");
  if (missingItems.length) {
    const uniqueMissing = [...new Set(missingItems.map((item) => item.artifactRef))].slice(0, 8);
    uniqueMissing.forEach((artifact) => lines.push(`- Add or verify ${artifact}.`));
  } else {
    lines.push("- Add live local or GitHub inspection only after the replay path stays reliable.");
  }

  return lines.join("\n");
};

export const generateReportJson = (
  state: EvaluationState,
  meta: FixtureMeta,
  panel: JudgeId[],
) => ({
  product: "Ralph Ledger",
  mode: meta.mode,
  fixture: {
    id: meta.id,
    name: meta.name,
    repoLabel: meta.repoLabel,
    track: meta.track,
    sourcePath: meta.sourcePath,
  },
  inspection: {
    commandExecution: false,
    staticOnly: meta.mode === "local-static",
  },
  panel: panel.map((judge) => ({
    id: judge,
    name: JUDGES[judge].name,
    homeDimension: JUDGES[judge].homeDimension,
  })),
  totalScore: Number(getTotalScore(state, panel).toFixed(1)),
  dimensions: RUBRIC.map((item) => {
    const criterion = state.criteria[item.id];
    const spread = getPanelSpread(criterion, panel);
    return {
      id: item.id,
      label: item.label,
      score: Number(getCriterionPanelScore(criterion, panel).toFixed(1)),
      max: item.max,
      confidence: Number(getCriterionConfidence(criterion).toFixed(2)),
      agreement: getAgreementLevel(criterion, panel),
      spread: {
        min: Number(spread.min.toFixed(1)),
        max: Number(spread.max.toFixed(1)),
      },
      perJudge: Object.fromEntries(
        panel.map((judge) => [judge, Number(getJudgeCriterionScore(criterion, judge).toFixed(1))]),
      ),
      evidence: criterion.evidence.map((item) => ({
        kind: item.kind,
        label: item.label,
        confidence: item.confidence,
        artifactRef: item.artifactRef,
        rubricClauseRef: item.rubricClauseRef,
      })),
      deductions: criterion.deductions.map((item) => ({
        kind: item.kind,
        label: item.label,
        confidence: item.confidence,
        artifactRef: item.artifactRef,
        rubricClauseRef: item.rubricClauseRef,
      })),
      missing: criterion.missing.map((item) => ({
        label: item.label,
        artifactRef: item.artifactRef,
      })),
    };
  }),
  panelSplits: Object.values(state.panelSplits).filter(Boolean),
  events: state.visibleEvents.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    stage: event.stage,
    message: event.message,
    severity: event.severity,
    details: event.details,
  })),
});
