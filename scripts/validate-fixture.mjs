import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredEventFields = ["id", "timestamp", "type", "stage", "message", "severity"];
const allowedEventTypes = new Set([
  "stage_started",
  "stage_completed",
  "track_selected",
  "panel_recommended",
  "panel_selected",
  "file_found",
  "file_missing",
  "stack_detected",
  "command_started",
  "command_completed",
  "command_failed",
  "evidence_found",
  "deduction_applied",
  "score_delta",
  "judge_score_delta",
  "confidence_changed",
  "panel_split_detected",
  "report_generated",
  "evaluation_completed",
]);
const allowedSeverities = new Set(["info", "success", "warning", "critical"]);
const allowedEvidenceKinds = new Set(["observed", "inferred", "user-claim", "missing"]);
const requiredScoreFields = [
  "criterion",
  "judge",
  "delta",
  "reason",
  "evidence",
  "confidence",
  "evidence_kind",
  "artifact_ref",
  "rubric_clause_ref",
];

const allowedCriteria = new Set([
  "impact",
  "technical_execution",
  "originality",
  "demo_quality",
  "harness_agent_engineering",
]);

const allowedJudges = new Set([
  "sam-altman",
  "andrej-karpathy",
  "ilya-sutskever",
  "brian-chesky",
  "harrison-chase",
]);
const requiredStages = [
  "intake",
  "track_panel",
  "stack_detection",
  "documentation_review",
  "prompt_discovery",
  "structure_inspection",
  "verification",
  "scoring",
  "panel_interpretation",
  "report_generation",
];

const maxByCriterion = {
  impact: 20,
  technical_execution: 20,
  originality: 15,
  demo_quality: 15,
  harness_agent_engineering: 30,
};
const phaseZeroPanel = ["harrison-chase", "brian-chesky"];

export const validateFixtureObject = (fixture, file = "fixture", options = {}) => {
  const allowedModes = new Set(options.allowedModes ?? ["replay"]);
  const failures = [];
  const totals = Object.fromEntries(
    Object.keys(maxByCriterion).map((criterion) => [
      criterion,
      Object.fromEntries([...allowedJudges].map((judge) => [judge, 0])),
    ]),
  );
  const scoreCoverage = Object.fromEntries(
    [...allowedJudges].map((judge) => [judge, new Set()]),
  );

  if (!fixture.meta || !allowedModes.has(fixture.meta.mode)) {
    failures.push(`Fixture must include meta.mode = ${[...allowedModes].join(" or ")}.`);
  }

  if (!Array.isArray(fixture.events) || fixture.events.length < 20) {
    failures.push("Fixture must include at least 20 events for a complete replay.");
  }

  const ids = new Set();
  let hasHarnessSplit = false;
  let hasCompletion = false;
  let hasReportGenerated = false;
  let previousTimestamp = 0;
  const completedStages = new Set();

  fixture.events.forEach((event, index) => {
    requiredEventFields.forEach((field) => {
      if (!(field in event)) {
        failures.push(`Event ${index + 1} is missing ${field}.`);
      }
    });

    if (ids.has(event.id)) {
      failures.push(`Duplicate event id: ${event.id}.`);
    }
    ids.add(event.id);

    if (!requiredStages.includes(event.stage)) {
      failures.push(`Event ${event.id} has invalid stage ${event.stage}.`);
    }
    if (!allowedEventTypes.has(event.type)) {
      failures.push(`Event ${event.id} has invalid type ${event.type}.`);
    }
    if (!allowedSeverities.has(event.severity)) {
      failures.push(`Event ${event.id} has invalid severity ${event.severity}.`);
    }

    const timestamp = Date.parse(event.timestamp);
    if (Number.isNaN(timestamp)) {
      failures.push(`Event ${event.id} has an invalid timestamp.`);
    } else if (timestamp < previousTimestamp) {
      failures.push(`Event ${event.id} timestamp is earlier than the previous event.`);
    }
    previousTimestamp = Number.isNaN(timestamp) ? previousTimestamp : timestamp;

    if (event.type === "score_delta") {
      if (!event.details || typeof event.details !== "object") {
        failures.push(`Score event ${event.id} must include a details object.`);
        return;
      }

      requiredScoreFields.forEach((field) => {
        if (!(field in event.details)) {
          failures.push(`Score event ${event.id} is missing details.${field}.`);
        }
      });

      if (!allowedCriteria.has(event.details.criterion)) {
        failures.push(`Score event ${event.id} has invalid criterion ${event.details.criterion}.`);
      }
      if (!allowedJudges.has(event.details.judge)) {
        failures.push(`Score event ${event.id} has invalid judge ${event.details.judge}.`);
      }
      if (typeof event.details.delta !== "number" || !Number.isFinite(event.details.delta)) {
        failures.push(`Score event ${event.id} delta must be a finite number.`);
      }
      if (typeof event.details.reason !== "string" || event.details.reason.length === 0) {
        failures.push(`Score event ${event.id} reason must be a non-empty string.`);
      }
      if (
        typeof event.details.confidence !== "number" ||
        event.details.confidence < 0 ||
        event.details.confidence > 1
      ) {
        failures.push(`Score event ${event.id} confidence must be between 0 and 1.`);
      }
      if (!allowedEvidenceKinds.has(event.details.evidence_kind)) {
        failures.push(
          `Score event ${event.id} has invalid evidence_kind ${event.details.evidence_kind}.`,
        );
      }
      if (!Array.isArray(event.details.evidence) || event.details.evidence.length === 0) {
        failures.push(`Score event ${event.id} must include at least one evidence item.`);
      } else if (event.details.evidence.some((item) => typeof item !== "string" || !item.length)) {
        failures.push(`Score event ${event.id} evidence items must be non-empty strings.`);
      }
      if (
        typeof event.details.artifact_ref !== "string" ||
        event.details.artifact_ref.length === 0
      ) {
        failures.push(`Score event ${event.id} artifact_ref must be a non-empty string.`);
      }
      if (
        typeof event.details.rubric_clause_ref !== "string" ||
        event.details.rubric_clause_ref.length === 0
      ) {
        failures.push(`Score event ${event.id} rubric_clause_ref must be a non-empty string.`);
      }
      if (event.details.evidence_kind === "missing" && event.details.delta > 0) {
        failures.push(`Score event ${event.id} cannot add points for missing evidence.`);
      }
      if (event.details.evidence_kind === "missing" && event.details.confidence !== 0) {
        failures.push(`Score event ${event.id} missing evidence must have confidence 0.`);
      }

      if (allowedCriteria.has(event.details.criterion) && allowedJudges.has(event.details.judge)) {
        const criterion = event.details.criterion;
        const judge = event.details.judge;
        const nextScore = totals[criterion][judge] + event.details.delta;
        totals[criterion][judge] = Math.max(0, Math.min(maxByCriterion[criterion], nextScore));
        scoreCoverage[judge].add(criterion);
      }
    }

    if (
      event.type === "panel_split_detected" &&
      event.details?.criterion === "harness_agent_engineering" &&
      event.details?.highestJudge === "harrison-chase" &&
      event.details?.lowestJudge === "brian-chesky"
    ) {
      hasHarnessSplit = true;
    }

    if (event.type === "evaluation_completed") {
      if (!hasReportGenerated) {
        failures.push(`Event ${event.id} completed before report_generated.`);
      }
      if (index !== fixture.events.length - 1) {
        failures.push(`Event ${event.id} evaluation_completed must be the final event.`);
      }
      hasCompletion = true;
    }
    if (event.type === "report_generated") {
      hasReportGenerated = true;
    }
    if (event.type === "stage_completed") {
      completedStages.add(event.stage);
    }
  });

  if (fixture.meta.requiredHarnessSplit && !hasHarnessSplit) {
    failures.push("Fixture must create the required Harrison/Brian harness split.");
  }

  if (!hasCompletion) {
    failures.push("Fixture must end with evaluation_completed.");
  }
  if (!hasReportGenerated) {
    failures.push("Fixture must include report_generated before completion.");
  }

  requiredStages.forEach((stage) => {
    if (!completedStages.has(stage)) {
      failures.push(`Fixture must complete required stage ${stage}.`);
    }
  });

  [...allowedJudges].forEach((judge) => {
    [...allowedCriteria].forEach((criterion) => {
      if (!scoreCoverage[judge].has(criterion)) {
        failures.push(`Fixture must include authored ${judge} score_delta for ${criterion}.`);
      }
    });
  });

  const panelScore = Object.entries(maxByCriterion).reduce((sum, [criterion]) => {
    const criterionScore =
      phaseZeroPanel.reduce((innerSum, judge) => innerSum + totals[criterion][judge], 0) /
      phaseZeroPanel.length;
    return sum + criterionScore;
  }, 0);

  const harnessSpread = Math.abs(
    totals.harness_agent_engineering["harrison-chase"] -
      totals.harness_agent_engineering["brian-chesky"],
  );

  if (fixture.meta.expectedScoreBand) {
    const { min, max } = fixture.meta.expectedScoreBand;
    if (panelScore < min || panelScore > max) {
      failures.push(
        `Fixture score should be in ${min}-${max}; computed ${panelScore.toFixed(1)}.`,
      );
    }
  }

  if (fixture.meta.requiredHarnessSplit && harnessSpread < 8) {
    failures.push(
      `Harrison/Brian harness spread should be meaningful; computed ${harnessSpread.toFixed(1)}.`,
    );
  }

  return {
    file,
    eventCount: fixture.events.length,
    idCount: ids.size,
    failures,
    panelScore,
    harnessSpread,
  };
};

export const validateFixturePath = (fixturePath, options = {}) =>
  validateFixtureObject(
    JSON.parse(fs.readFileSync(fixturePath, "utf8")),
    path.basename(fixturePath),
    options,
  );

export const getReplayFixturePaths = (root = process.cwd()) => {
  const fixturesDir = path.join(root, "src", "fixtures");
  return fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".fixture.json"))
    .map((file) => path.join(fixturesDir, file));
};

export const runFixtureValidation = (fixturePaths = getReplayFixturePaths()) => {
  const results = fixturePaths.map((fixturePath) => validateFixturePath(fixturePath));
  const failures = results.flatMap((result) =>
    result.failures.map((failure) => `${result.file}: ${failure}`),
  );

  if (failures.length) {
    console.error("Fixture validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  const summary = results
    .map(
      (result) =>
        `${result.file}: ${result.eventCount} events, score ${result.panelScore.toFixed(
          1,
        )}, harness spread ${result.harnessSpread.toFixed(1)}`,
    )
    .join("; ");

  console.log(`Fixture validation passed for ${results.length} fixtures. ${summary}.`);
};

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  runFixtureValidation();
}
