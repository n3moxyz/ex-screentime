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

  console.log("Report unit tests passed.");
} finally {
  await server.close();
}
