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

type InspectionMode = "replay" | "local-static" | "github-clone";

const resolveMode = (meta: FixtureMeta): InspectionMode => {
  if (meta.mode === "local-static") {
    return meta.submittedRepoUrl ? "github-clone" : "local-static";
  }
  return "replay";
};

const inspectionLines = (mode: InspectionMode, meta: FixtureMeta) => {
  switch (mode) {
    case "github-clone":
      return [
        `- Cloned ${meta.submittedRepoUrl ?? "submitted GitHub URL"} into ${meta.sourcePath ?? "a temporary directory"}.`,
        "- Ran the same read-only static pipeline used by Local Path Mode against the cloned tree.",
        "- Did not run install, build, or test commands. Ralph Ledger does not sandbox arbitrary code.",
      ];
    case "local-static":
      return [
        `- Inspected the local repo at ${meta.sourcePath ?? "the submitted path"}.`,
        "- Read safe documentation, manifests, source layout, scripts, fixtures, and judge files.",
        "- Did not run install, build, test, or any other repo commands.",
      ];
    case "replay":
    default:
      return [
        "- Replayed a deterministic curated event log against the same scoring state used by the live UI.",
        "- Did not fetch, clone, install, build, or test any remote repo.",
        meta.submittedRepoUrl
          ? `- Captured ${meta.submittedRepoUrl} as the submitted URL but used the safe replay baseline instead of fetching it.`
          : "- No external repo URL was submitted; the replay baseline is the only source of evidence.",
      ];
  }
};

const buildStrengths = (mode: InspectionMode, hasPanelSplit: boolean) => {
  const strengths = [
    mode === "local-static"
      ? "Local Path Mode inspected safe files without executing arbitrary commands."
      : mode === "github-clone"
        ? "GitHub URL Mode performed read-only static inspection on a cloned working tree."
        : "Replay fixture mode is deterministic and clearly labeled.",
    "Score movement is tied to evidence, confidence, artifact references, and judge lenses.",
    hasPanelSplit
      ? "Meaningful panel disagreement is visible and explained with a resolution note."
      : "Panel consensus is shown explicitly rather than inventing a disagreement.",
  ];
  return strengths;
};

const buildWeaknesses = (mode: InspectionMode, hasSubmittedUrl: boolean) => {
  switch (mode) {
    case "local-static":
      return [
        "Local Path Mode is static-only; documented build or test commands were not executed.",
        "Static inspection can observe files and scripts, but it cannot prove runtime behavior.",
      ];
    case "github-clone":
      return [
        "GitHub URL Mode reads files from a clone but does not run install, build, or tests.",
        "Ralph Ledger does not sandbox hostile code; only known-good public repos should be evaluated.",
      ];
    case "replay":
    default:
      return [
        hasSubmittedUrl
          ? "The submitted GitHub URL was captured but not fetched or cloned in this build."
          : "GitHub URL Mode is intentionally deferred.",
        "Replay fixtures use curated event logs rather than live repo verification.",
      ];
  }
};

const buildDemoReadiness = (mode: InspectionMode, meta: FixtureMeta) => {
  return [
    `Recommended demo path: ${
      mode === "local-static"
        ? "Static Local Path Mode against a known-good repo"
        : mode === "github-clone"
          ? "GitHub URL Mode with a vetted public repo and replay fallback ready"
          : "Replay Fixture Mode using the strongest deterministic baseline"
    }.`,
    "Safe replay demo is one click from a cold screen; URL entry is not required to start a working session.",
    "Compare Fixtures tab keeps calibration fixtures available for educational panel-split storytelling.",
    `Target judging duration: ${meta.mode === "replay" ? "≈ 90 seconds end-to-end" : "≈ 2 minutes including inspection setup"}.`,
  ];
};

const tablePipe = (cells: string[]) => `| ${cells.join(" | ")} |`;

const escapePipes = (value: string) => value.replace(/\|/g, "\\|");

export const generateReportMarkdown = (
  state: EvaluationState,
  meta: FixtureMeta,
  panel: JudgeId[],
) => {
  const total = getTotalScore(state, panel);
  const hasPanelSplit = Object.values(state.panelSplits).some((split) => split?.meaningful);
  const mode = resolveMode(meta);
  const hasSubmittedUrl = Boolean(meta.submittedRepoUrl);
  const strengths = buildStrengths(mode, hasPanelSplit);
  const weaknesses = buildWeaknesses(mode, hasSubmittedUrl);
  const demoReadiness = buildDemoReadiness(mode, meta);
  const missingItems = RUBRIC.flatMap((item) =>
    state.criteria[item.id].missing.map((missing) => ({
      criterion: item.label,
      label: missing.label,
      artifactRef: missing.artifactRef,
      rubricClauseRef: missing.rubricClauseRef,
    })),
  );

  const lines = [
    "# Ralph Ledger Judge Report",
    "",
    `Fixture: ${meta.name}`,
    `Track: ${meta.track}`,
    `Mode: ${meta.mode}`,
    ...(meta.submittedRepoUrl ? [`Submitted URL: ${meta.submittedRepoUrl}`] : []),
    ...(meta.sourcePath ? [`Source path: ${meta.sourcePath}`] : []),
    `Panel: ${panel.map((judge) => JUDGES[judge].name).join(", ")}`,
    `Final score: ${fmt(total)} / 100`,
    "",
    "## Executive Summary",
    meta.summary,
    "",
    "## What Was Inspected",
    ...inspectionLines(mode, meta),
    "",
    "## Selected Panel",
  ];

  panel.forEach((judge) => {
    lines.push(
      `- ${JUDGES[judge].name}: ${RUBRIC_BY_ID[JUDGES[judge].homeDimension].label} lens`,
    );
  });

  lines.push("", "## Scorecard");
  lines.push(tablePipe(["Dimension", "Score", "Confidence", "Agreement", "Spread"]));
  lines.push(tablePipe(["---", "---", "---", "---", "---"]));
  RUBRIC.forEach((item) => {
    const criterion = state.criteria[item.id];
    const spread = getPanelSpread(criterion, panel);
    lines.push(
      tablePipe([
        item.label,
        `${fmt(getCriterionPanelScore(criterion, panel))} / ${item.max}`,
        `${Math.round(getCriterionConfidence(criterion) * 100)}%`,
        getAgreementLevel(criterion, panel),
        `${fmt(spread.min)}-${fmt(spread.max)}`,
      ]),
    );
  });

  lines.push("", "## Per-Judge Breakdown");
  lines.push(
    tablePipe([
      "Judge",
      ...RUBRIC.map((item) => item.label),
      "Total",
    ]),
  );
  lines.push(tablePipe(Array(RUBRIC.length + 2).fill("---")));
  panel.forEach((judgeId) => {
    const perCriterion = RUBRIC.map((item) =>
      `${fmt(getJudgeCriterionScore(state.criteria[item.id], judgeId))} / ${item.max}`,
    );
    const judgeTotal = RUBRIC.reduce(
      (sum, item) => sum + getJudgeCriterionScore(state.criteria[item.id], judgeId),
      0,
    );
    lines.push(tablePipe([JUDGES[judgeId].name, ...perCriterion, fmt(judgeTotal)]));
  });

  lines.push("", "## Strengths");
  strengths.forEach((strength) => lines.push(`- ${strength}`));

  lines.push("", "## Weaknesses / Known Limits");
  weaknesses.forEach((weakness) => lines.push(`- ${weakness}`));

  lines.push("", "## Demo Readiness");
  demoReadiness.forEach((line) => lines.push(`- ${line}`));

  lines.push("", "## Evidence Trail");
  RUBRIC.forEach((item) => {
    const criterion = state.criteria[item.id];
    lines.push("", `### ${item.label}`);
    if (criterion.changes.length === 0) {
      lines.push("- No score deltas recorded for this dimension.");
      return;
    }
    lines.push(tablePipe(["Judge", "Δ", "Evidence kind", "Reason", "Artifact"]));
    lines.push(tablePipe(["---", "---", "---", "---", "---"]));
    criterion.changes.forEach((change) => {
      lines.push(
        tablePipe([
          JUDGES[change.judge].name,
          `${change.delta > 0 ? "+" : ""}${fmt(change.delta)}`,
          change.evidenceKind,
          escapePipes(change.reason),
          escapePipes(change.artifactRef),
        ]),
      );
    });
  });

  lines.push("", "## Missing Evidence");
  if (missingItems.length) {
    missingItems.forEach((item) =>
      lines.push(
        `- ${item.criterion}: ${item.label} (${item.artifactRef}, clause ${item.rubricClauseRef})`,
      ),
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
  } else if (mode === "replay" && hasSubmittedUrl) {
    lines.push("- Wire the captured GitHub URL through the live clone-and-inspect path.");
  } else if (mode === "replay") {
    lines.push("- Add live local or GitHub inspection only after the replay path stays reliable.");
  } else {
    lines.push("- Layer documented command execution behind an explicit trust gate before claiming verified runtime behavior.");
  }

  return lines.join("\n");
};

export const generateReportJson = (
  state: EvaluationState,
  meta: FixtureMeta,
  panel: JudgeId[],
) => {
  const mode = resolveMode(meta);
  const hasPanelSplit = Object.values(state.panelSplits).some((split) => split?.meaningful);
  const total = getTotalScore(state, panel);
  return {
    product: "Ralph Ledger",
    mode: meta.mode,
    inspectionMode: mode,
    fixture: {
      id: meta.id,
      name: meta.name,
      repoLabel: meta.repoLabel,
      track: meta.track,
      submittedRepoUrl: meta.submittedRepoUrl,
      sourcePath: meta.sourcePath,
    },
    inspection: {
      commandExecution: false,
      githubFetch: mode === "github-clone",
      replayBaseline: mode === "replay",
      staticOnly: mode === "local-static" || mode === "github-clone",
    },
    panel: panel.map((judge) => {
      const judgeTotal = RUBRIC.reduce(
        (sum, item) => sum + getJudgeCriterionScore(state.criteria[item.id], judge),
        0,
      );
      return {
        id: judge,
        name: JUDGES[judge].name,
        homeDimension: JUDGES[judge].homeDimension,
        total: Number(judgeTotal.toFixed(1)),
      };
    }),
    totalScore: Number(total.toFixed(1)),
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
          rubricClauseRef: item.rubricClauseRef,
          criterionLabel: RUBRIC_BY_ID[criterion.criterion].label,
        })),
        changes: criterion.changes.map((change) => ({
          judge: change.judge,
          delta: Number(change.delta.toFixed(2)),
          reason: change.reason,
          evidence: change.evidence,
          evidenceKind: change.evidenceKind,
          confidence: change.confidence,
          artifactRef: change.artifactRef,
          rubricClauseRef: change.rubricClauseRef,
          stage: change.stage,
          timestamp: change.timestamp,
        })),
      };
    }),
    panelSplits: Object.values(state.panelSplits).filter(Boolean),
    narrative: {
      strengths: buildStrengths(mode, hasPanelSplit),
      weaknesses: buildWeaknesses(mode, Boolean(meta.submittedRepoUrl)),
      demoReadiness: buildDemoReadiness(mode, meta),
      inspectionNotes: inspectionLines(mode, meta),
    },
    events: state.visibleEvents.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      stage: event.stage,
      message: event.message,
      severity: event.severity,
      details: event.details,
    })),
  };
};
