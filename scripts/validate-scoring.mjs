import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixturesDir = path.join(root, "src", "fixtures");
const fixturePaths = fs
  .readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".fixture.json"))
  .map((file) => path.join(fixturesDir, file));

const judges = [
  "sam-altman",
  "andrej-karpathy",
  "ilya-sutskever",
  "brian-chesky",
  "harrison-chase",
];
const criteria = [
  "impact",
  "technical_execution",
  "originality",
  "demo_quality",
  "harness_agent_engineering",
];
const maxByCriterion = {
  impact: 20,
  technical_execution: 20,
  originality: 15,
  demo_quality: 15,
  harness_agent_engineering: 30,
};
const panels = {
  "Phase 0 Split Demo": ["harrison-chase", "brian-chesky"],
  "Overall Ralphthon": judges,
  "Impact Track": [
    "sam-altman",
    "brian-chesky",
    "ilya-sutskever",
    "andrej-karpathy",
    "harrison-chase",
  ],
  "Harness / Skills Track": [
    "harrison-chase",
    "andrej-karpathy",
    "ilya-sutskever",
    "sam-altman",
    "brian-chesky",
  ],
  "Technical Execution": [
    "andrej-karpathy",
    "harrison-chase",
    "ilya-sutskever",
    "brian-chesky",
    "sam-altman",
  ],
  "Demo Readiness": [
    "brian-chesky",
    "sam-altman",
    "andrej-karpathy",
    "harrison-chase",
    "ilya-sutskever",
  ],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const summarizeFixture = (fixturePath) => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const totals = Object.fromEntries(
    criteria.map((criterion) => [
      criterion,
      Object.fromEntries(judges.map((judge) => [judge, 0])),
    ]),
  );
  const coverage = Object.fromEntries(judges.map((judge) => [judge, new Set()]));
  const confidence = Object.fromEntries(criteria.map((criterion) => [criterion, []]));
  const failures = [];

  fixture.events
    .filter((event) => event.type === "score_delta")
    .forEach((event) => {
      const details = event.details;
      totals[details.criterion][details.judge] = clamp(
        totals[details.criterion][details.judge] + details.delta,
        0,
        maxByCriterion[details.criterion],
      );
      coverage[details.judge].add(details.criterion);
      confidence[details.criterion].push(details.confidence);
    });

  judges.forEach((judge) => {
    criteria.forEach((criterion) => {
      if (!coverage[judge].has(criterion)) {
        failures.push(`${judge} has no authored scoring for ${criterion}`);
      }
    });
  });

  const scoreForPanel = (panel) =>
    criteria.reduce((sum, criterion) => {
      const criterionScore =
        panel.reduce((innerSum, judge) => innerSum + totals[criterion][judge], 0) / panel.length;
      return sum + criterionScore;
    }, 0);

  if (fixture.meta.expectedScoreBand) {
    Object.entries(panels).forEach(([name, panel]) => {
      const score = scoreForPanel(panel);
      if (score < fixture.meta.expectedScoreBand.min || score > fixture.meta.expectedScoreBand.max) {
        failures.push(
          `${name} score ${score.toFixed(1)} is outside expected ${fixture.meta.expectedScoreBand.min}-${fixture.meta.expectedScoreBand.max}`,
        );
      }
    });
  }

  const harrisonHarness = totals.harness_agent_engineering["harrison-chase"];
  const brianHarness = totals.harness_agent_engineering["brian-chesky"];
  if (fixture.meta.requiredHarnessSplit && harrisonHarness - brianHarness < 8) {
    failures.push(
      `required harness split too small: ${harrisonHarness.toFixed(1)}-${brianHarness.toFixed(1)}`,
    );
  }

  criteria.forEach((criterion) => {
    if (confidence[criterion].length === 0) {
      failures.push(`${criterion} has no confidence values`);
    }
  });

  return {
    file: path.basename(fixturePath),
    failures,
    defaultScore: scoreForPanel(panels["Phase 0 Split Demo"]),
    fiveLensScore: scoreForPanel(panels["Overall Ralphthon"]),
  };
};

const summaries = fixturePaths.map(summarizeFixture);
const failures = summaries.flatMap((summary) =>
  summary.failures.map((failure) => `${summary.file}: ${failure}`),
);

if (failures.length) {
  console.error("Scoring validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Scoring validation passed. ${summaries
    .map(
      (summary) =>
        `${summary.file}: phase0 ${summary.defaultScore.toFixed(1)}, five-lens ${summary.fiveLensScore.toFixed(1)}`,
    )
    .join("; ")}.`,
);
