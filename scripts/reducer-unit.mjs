import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

const makeScoreDelta = ({ details: detailOverrides = {}, ...eventOverrides } = {}) => ({
  id: `test-score-${Math.random().toString(36).slice(2)}`,
  timestamp: "2026-05-17T00:00:00.000Z",
  type: "score_delta",
  stage: "scoring",
  message: "test score delta",
  severity: "success",
  details: {
    criterion: "impact",
    judge: "sam-altman",
    delta: 1,
    reason: "test reason",
    evidence: ["test evidence"],
    confidence: 1,
    evidence_kind: "observed",
    artifact_ref: "test:artifact",
    rubric_clause_ref: "impact.test",
    ...detailOverrides,
  },
  ...eventOverrides,
});

const makeSplit = ({ details: detailOverrides = {}, ...eventOverrides } = {}) => ({
  id: `test-split-${Math.random().toString(36).slice(2)}`,
  timestamp: "2026-05-17T00:00:00.000Z",
  type: "panel_split_detected",
  stage: "panel_interpretation",
  message: "test panel split",
  severity: "warning",
  details: {
    criterion: "harness_agent_engineering",
    consensus: "low",
    meaningful: true,
    highestJudge: "harrison-chase",
    highestReason: "sees strong harness evidence",
    lowestJudge: "brian-chesky",
    lowestReason: "needs clearer demo story",
    resolutionNote: "split is meaningful",
    ...detailOverrides,
  },
  ...eventOverrides,
});

try {
  const reducer = await server.ssrLoadModule("/src/evaluator/reducer.ts");
  const {
    applyEvent,
    createInitialState,
    getAgreementLevel,
    getCriterionPanelScore,
    getPanelSpread,
  } = reducer;

  let state = createInitialState();
  state = applyEvent(state, makeScoreDelta({ details: { delta: 999 } }));
  assert.equal(
    getCriterionPanelScore(state.criteria.impact, ["sam-altman"]),
    20,
    "positive score deltas clamp to criterion max",
  );
  state = applyEvent(state, makeScoreDelta({ details: { delta: -999 } }));
  assert.equal(
    getCriterionPanelScore(state.criteria.impact, ["sam-altman"]),
    0,
    "negative score deltas clamp to zero",
  );

  const malformedScoreState = applyEvent(
    createInitialState(),
    makeScoreDelta({ details: { criterion: "not-a-real-criterion" } }),
  );
  assert.equal(
    getCriterionPanelScore(malformedScoreState.criteria.impact, ["sam-altman"]),
    0,
    "malformed score_delta details are ignored without mutating scores",
  );

  state = createInitialState();
  state = applyEvent(state, makeScoreDelta({ details: { judge: "sam-altman", delta: 2.4 } }));
  assert.deepEqual(
    getPanelSpread(state.criteria.impact, ["sam-altman", "andrej-karpathy"]),
    { min: 0, max: 2.4, spread: 2.4 },
    "panel spread exposes min, max, and spread",
  );
  assert.equal(
    getAgreementLevel(state.criteria.impact, ["sam-altman", "andrej-karpathy"]),
    "medium",
    "12 percent spread is medium agreement",
  );
  state = applyEvent(state, makeScoreDelta({ details: { judge: "sam-altman", delta: 2.6 } }));
  assert.equal(
    getAgreementLevel(state.criteria.impact, ["sam-altman", "andrej-karpathy"]),
    "low",
    "25 percent spread is low agreement",
  );

  const malformedSplitState = applyEvent(
    createInitialState(),
    makeSplit({ details: { highestJudge: "not-a-real-judge" } }),
  );
  assert.equal(
    Object.keys(malformedSplitState.panelSplits).length,
    0,
    "malformed panel_split_detected details are ignored",
  );

  const validSplitState = applyEvent(createInitialState(), makeSplit());
  assert.equal(
    validSplitState.panelSplits.harness_agent_engineering?.highestJudge,
    "harrison-chase",
    "valid panel_split_detected details are stored",
  );

  console.log("Reducer unit tests passed.");
} finally {
  await server.close();
}
