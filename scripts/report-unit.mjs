import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";

const fixture = JSON.parse(fs.readFileSync("src/fixtures/strong-harness.fixture.json", "utf8"));

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [{ generateReportJson, generateReportMarkdown }, reducer, { JUDGES }, { RUBRIC }] =
    await Promise.all([
      server.ssrLoadModule("/src/evaluator/report.ts"),
      server.ssrLoadModule("/src/evaluator/reducer.ts"),
      server.ssrLoadModule("/src/evaluator/judges.ts"),
      server.ssrLoadModule("/src/evaluator/rubric.ts"),
    ]);
  const panel = fixture.meta.panel;
  const state = reducer.replayEvents(fixture.events, fixture.events.length);
  const finalScore = reducer.getTotalScore(state, panel);
  const markdown = generateReportMarkdown(state, fixture.meta, panel);
  const reportJson = generateReportJson(state, fixture.meta, panel);

  RUBRIC.forEach((criterion) => {
    assert.match(
      markdown,
      new RegExp(criterion.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `markdown report should include ${criterion.label}`,
    );
    assert.ok(
      reportJson.dimensions.some((dimension) => dimension.label === criterion.label),
      `json report should include ${criterion.label}`,
    );
  });

  panel.forEach((judge) => {
    assert.match(markdown, new RegExp(JUDGES[judge].name), `markdown should include ${judge}`);
    assert.ok(
      reportJson.panel.some((panelJudge) => panelJudge.id === judge),
      `json should include ${judge}`,
    );
  });

  assert.match(
    markdown,
    new RegExp(`Final score: ${finalScore.toFixed(1)} / 100`),
    "markdown should include the final score",
  );
  assert.equal(
    reportJson.totalScore,
    Number(finalScore.toFixed(1)),
    "json should include the final score",
  );

  const requiredSections = [
    "## Executive Summary",
    "## What Was Inspected",
    "## Selected Panel",
    "## Scorecard",
    "## Per-Judge Breakdown",
    "## Strengths",
    "## Weaknesses / Known Limits",
    "## Demo Readiness",
    "## Evidence Trail",
    "## Missing Evidence",
    "## Confidence Notes",
    "## Panel Disagreement",
    "## Suggested Improvements",
  ];
  requiredSections.forEach((heading) => {
    assert.ok(
      markdown.includes(heading),
      `markdown should include the ${heading.replace(/^## /, "")} section`,
    );
  });

  assert.ok(
    markdown.includes("| Dimension | Score | Confidence | Agreement | Spread |"),
    "scorecard should render as a markdown table",
  );
  assert.ok(
    markdown.includes("| Judge | Δ | Evidence kind | Reason | Artifact |"),
    "evidence trail should render as a per-dimension table",
  );

  panel.forEach((judge) => {
    const flatPanel = reportJson.panel.find((entry) => entry.id === judge);
    assert.ok(flatPanel, `json panel entry should exist for ${judge}`);
    assert.equal(
      typeof flatPanel.total,
      "number",
      `json panel entry for ${judge} should include a total`,
    );
  });

  reportJson.dimensions.forEach((dimension) => {
    assert.ok(
      Array.isArray(dimension.changes),
      `${dimension.label} should expose its per-judge changes in JSON`,
    );
    assert.ok(
      dimension.changes.every(
        (change) =>
          typeof change.judge === "string" &&
          typeof change.delta === "number" &&
          typeof change.reason === "string" &&
          typeof change.evidenceKind === "string",
      ),
      `${dimension.label} change entries should include judge, delta, reason, evidenceKind`,
    );
    dimension.missing.forEach((entry) => {
      assert.ok(
        entry.criterionLabel === dimension.label,
        `${dimension.label} missing entries should carry the dimension label`,
      );
      assert.ok(
        typeof entry.rubricClauseRef === "string" && entry.rubricClauseRef.length > 0,
        `${dimension.label} missing entries should carry a rubric clause ref`,
      );
    });
  });

  assert.ok(reportJson.narrative, "json should include a narrative block");
  assert.ok(
    Array.isArray(reportJson.narrative.strengths) && reportJson.narrative.strengths.length > 0,
    "narrative.strengths should be populated",
  );
  assert.ok(
    Array.isArray(reportJson.narrative.weaknesses) && reportJson.narrative.weaknesses.length > 0,
    "narrative.weaknesses should be populated",
  );
  assert.ok(
    Array.isArray(reportJson.narrative.demoReadiness) &&
      reportJson.narrative.demoReadiness.length > 0,
    "narrative.demoReadiness should be populated",
  );
  assert.ok(
    Array.isArray(reportJson.narrative.inspectionNotes) &&
      reportJson.narrative.inspectionNotes.length > 0,
    "narrative.inspectionNotes should be populated",
  );

  assert.equal(reportJson.inspectionMode, "replay", "default strong fixture is replay mode");
  assert.equal(reportJson.inspection.commandExecution, false);
  assert.equal(reportJson.inspection.githubFetch, false);
  assert.equal(reportJson.inspection.replayBaseline, true);
  assert.equal(reportJson.inspection.staticOnly, false);

  const githubMeta = {
    ...fixture.meta,
    mode: "local-static",
    submittedRepoUrl: "https://github.com/n3moxyz/ralph-ledger",
    sourcePath: "/tmp/ralph-ledger-clone",
  };
  const githubMarkdown = generateReportMarkdown(state, githubMeta, panel);
  const githubJson = generateReportJson(state, githubMeta, panel);
  assert.equal(
    githubJson.inspectionMode,
    "github-clone",
    "local-static meta + submittedRepoUrl should resolve as github-clone",
  );
  assert.equal(githubJson.inspection.githubFetch, true);
  assert.equal(githubJson.inspection.staticOnly, true);
  assert.ok(
    githubMarkdown.includes("Cloned https://github.com/n3moxyz/ralph-ledger"),
    "github-clone markdown should describe the cloned repo",
  );

  const localMeta = {
    ...fixture.meta,
    mode: "local-static",
    sourcePath: "/tmp/local-repo",
  };
  delete localMeta.submittedRepoUrl;
  const localJson = generateReportJson(state, localMeta, panel);
  assert.equal(
    localJson.inspectionMode,
    "local-static",
    "local-static meta without URL should resolve as local-static",
  );
  assert.equal(localJson.inspection.githubFetch, false);
  assert.equal(localJson.inspection.staticOnly, true);

  const replayWithCapturedUrl = {
    ...fixture.meta,
    submittedRepoUrl: "https://github.com/captured/only",
  };
  const capturedJson = generateReportJson(state, replayWithCapturedUrl, panel);
  assert.equal(
    capturedJson.inspectionMode,
    "replay",
    "replay meta + captured URL (no actual clone) should remain replay mode",
  );
  assert.equal(capturedJson.inspection.replayBaseline, true);

  console.log("Report unit tests passed.");
} finally {
  await server.close();
}
