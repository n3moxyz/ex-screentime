import assert from "node:assert/strict";
import { createServer } from "vite";
import { validateFixtureObject } from "./validate-fixture.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [{ buildLocalFixture }, { JUDGES }, { RUBRIC }] = await Promise.all([
    server.ssrLoadModule("/src/evaluator/local-inspect.ts"),
    server.ssrLoadModule("/src/evaluator/judges.ts"),
    server.ssrLoadModule("/src/evaluator/rubric.ts"),
  ]);

  const fixture = buildLocalFixture(".");
  const validation = validateFixtureObject(fixture, "buildLocalFixture(.)", {
    allowedModes: ["local-static"],
  });

  assert.deepEqual(
    validation.failures,
    [],
    `buildLocalFixture(.) should emit a valid fixture:\n${validation.failures.join("\n")}`,
  );

  const coverage = new Set(
    fixture.events
      .filter((event) => event.type === "score_delta")
      .map((event) => `${event.details?.judge}:${event.details?.criterion}`),
  );
  const missingCoverage = Object.keys(JUDGES).flatMap((judge) =>
    RUBRIC.filter((criterion) => !coverage.has(`${judge}:${criterion.id}`)).map(
      (criterion) => `${judge}:${criterion.id}`,
    ),
  );

  assert.deepEqual(
    missingCoverage,
    [],
    `buildLocalFixture(.) should emit score_delta coverage for every judge and criterion.`,
  );

  console.log("Local inspect unit tests passed.");
} finally {
  await server.close();
}
