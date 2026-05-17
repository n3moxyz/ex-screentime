# Ralph Ledger Submission

## Summary

Ralph Ledger is a transparent assessment cockpit for Ralphthon submissions. It replays a structured evaluation event log through a live UI so judges can see evidence arrive, scores move, confidence change, deductions apply, and judge lenses disagree.

The current build implements the Phase 0 walking skeleton from `SPEC.md` plus the main Phase 1 evaluator-cockpit slice.

## Demo

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`, paste a GitHub repo URL, choose `Harness`, `Impact`, or `Overall Ralphthon`, then start the evaluation. The hidden `Strong Harness Replay` remains the safe judging baseline until live GitHub fetching is implemented.

## What Works

- Primary intake is now GitHub URL, three evaluation tracks, and Start.
- The strong deterministic replay fixture is hidden as the default safe baseline.
- Medium and weak fixtures remain available in Compare Fixtures as calibration assets.
- Live Evaluation View renders staged events.
- Scorecard View updates from `score_delta` events.
- Evidence Inspector shows evidence, deductions, missing evidence, confidence, artifact references, and rubric clauses.
- Phase 0 panel uses Harrison Chase and Brian Chesky.
- All five evaluator lenses now have authored per-event replay score deltas in strong, medium, and weak fixtures.
- Track selection automatically picks the evaluator panel for Harness, Impact, and Overall Ralphthon.
- Advanced panel details still support Phase 0 split and custom 3 to 5 evaluator lens testing.
- Track presets foreground the relevant rubric dimensions in the scorecard and evidence inspector.
- Local Path Mode is available behind `Local static fallback`, performs read-only static inspection of safe files, and emits the same structured event stream without running repo commands.
- Panel Splits View shows the required Harness / Agent Engineering disagreement.
- Compare Fixtures view explains why strong, medium, and weak fixtures exist and shows their scores under the selected panel.
- Judge Report View is generated from the final replay state.
- Judge Report View can export the current report as Markdown or JSON.
- Scorecard includes a score-change rail for the latest visible deltas.
- `npm run validate` checks fixture schema, completion, expected score bands, five-lens score coverage, and the strong fixture's Harrison/Brian harness split.

## Verification

Latest local check:

```bash
npm run check
npm audit --audit-level=moderate
npm run smoke:visual
```

Result: passing. `npm run smoke:visual` requires the dev server to be running. Audit reports 0 vulnerabilities. Fixture validation reports:

- Strong fixture: 73 events, Phase 0 score 72.7/100, five-lens score 74.9/100, 9.2-point Harrison/Brian harness spread.
- Medium fixture: 61 events, Phase 0 score 48.5/100, five-lens score 49.6/100.
- Weak fixture: 53 events, Phase 0 score 5.0/100, five-lens score 5.3/100.

Visual smoke opens the app in headless system Chrome at desktop and mobile widths, fills the GitHub URL intake, verifies the demo fixture dropdown is not exposed in the primary flow, checks simplified track switching, checks Local Path Mode against this repo through the fallback drawer, switches back to the strong calibration fixture through Compare Fixtures, checks the advanced panel override, starts the evaluation, waits for completion, opens the Rubric and Judge Report tabs, verifies the final score text, triggers JSON export, checks for horizontal overflow, and writes ignored screenshots to `ledger/visual-smoke-*.png`.

## Known Limits

- GitHub URL Mode captures the URL in the primary flow, but live remote fetching is intentionally deferred.
- Local Path Mode is static-only and does not execute documented commands yet.
- Replay evidence is pre-recorded and labeled as replay; it is not presented as live repo verification.
- `src/app/App.tsx`, `src/app/styles.css`, and `vite.config.ts` are still consolidated Phase 1 files; the next pass should split view components, styles, and local-inspection middleware.

## Self-Score

| Metric | Status | Notes |
| --- | --- | --- |
| Demo Success | 8/10 | Main flow is URL, three-way track, and Start; calibration fixtures, advanced panel override, and static local inspection remain available. |
| Trust Success | 8/10 | Score movements include evidence, confidence, references, judge lens, missing evidence, and report notes. |
| Harness Track Success | 8/10 | Spec, prompt, five-lens fixture events, local static inspection, validation, and report are inspectable. |
| Technical Success | 8/10 | Build/typecheck/fixture validation/audit pass, plus desktop and mobile visual smoke. |
| Demo Quality Success | 8/10 | Main flow is reliable with visible score movement and panel disagreement. |
