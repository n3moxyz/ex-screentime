# Ralph Ledger Submission

## Summary

Ralph Ledger is a transparent assessment cockpit for Ralphthon submissions. It replays a structured evaluation event log through a live UI so judges can see evidence arrive, scores move, confidence change, deductions apply, and judge lenses disagree.

The current build implements the Phase 0 walking skeleton from `SPEC.md`, the full Phase 1 evaluator-cockpit slice, and the Phase 2 stretch items: a one-click safe replay path, polished Markdown/JSON exports, harness-heavy and impact-heavy calibration fixtures, and a GitHub URL Mode that clones allowlisted public repos and runs the static inspection pipeline against them.

## Demo

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`, paste a GitHub repo URL, choose `Harness`, `Impact`, or `Overall Ralphthon`, then start the evaluation. From a cold screen the `Run safe replay demo` button is always one click away — it bypasses URL entry and runs the strong fixture against the chosen track. The `GitHub clone (allowlist only)` fallback panel will clone an allowlisted public repo and run the same static inspection pipeline used by Local Path Mode.

## What Works

- Primary intake is now GitHub URL, three evaluation tracks, and Start.
- A visible `Run safe replay demo` button is one click from a cold screen and runs the strong fixture without requiring URL entry.
- GitHub URL Mode clones any public `https://github.com/<org>/<repo>` URL with `git clone --depth 1 --no-tags --no-recurse-submodules --filter=blob:none --single-branch` (plus `protocol.file.allow=never`, `protocol.ext.allow=never`, `core.symlinks=false`), runs the same static inspection pipeline as Local Path Mode against the cloned tree, and cleans up the temp directory whether the clone succeeds or fails. Ralph Ledger never executes the cloned code — no install, build, test, hooks, or submodule fetches — so opening the input to any public repo is safe; the safety comes from the static pipeline, not from a URL gate.
- The strong deterministic replay fixture is hidden as the default safe baseline.
- Harness-heavy and impact-heavy calibration fixtures surface the educational panel splits (Harrison/Andrej vs Brian on harness; Sam/Brian vs Ilya/Andrej on impact) alongside medium and weak fixtures in Compare Fixtures.
- Live Evaluation View renders staged events.
- Scorecard View updates from `score_delta` events.
- Evidence Inspector shows evidence, deductions, missing evidence, confidence, artifact references, and rubric clauses.
- Phase 0 panel uses Harrison Chase and Brian Chesky.
- All five evaluator lenses now have authored per-event replay score deltas in strong, medium, and weak fixtures.
- Track selection automatically picks the evaluator panel for Harness, Impact, and Overall Ralphthon.
- Advanced panel details still support Phase 0 split and custom 3 to 5 evaluator lens testing.
- Track presets foreground the relevant rubric dimensions in the scorecard and evidence inspector.
- Replay speed is visible in the top bar and can be toggled without editing the URL.
- Local Path Mode is available behind `Local static fallback`, performs read-only static inspection of safe files, and emits the same structured event stream without running repo commands.
- Local Path Mode scoring now uses the shared judge and rubric constants from `src/evaluator/*`.
- Panel Splits View shows the required Harness / Agent Engineering disagreement.
- Compare Fixtures view explains why strong, medium, and weak fixtures exist and shows their scores under the selected panel.
- Judge Report View is generated from the final replay state.
- Markdown export includes a scorecard table, per-judge breakdown table, evidence-trail tables per dimension, an inspection summary that distinguishes replay / GitHub clone / local static, demo readiness notes, missing-evidence with rubric clauses, confidence notes, panel disagreement, and grounded suggested improvements.
- JSON export adds an `inspectionMode` field, an `inspection` flag block (`commandExecution`, `githubFetch`, `replayBaseline`, `staticOnly`), per-judge totals, full per-criterion `changes` with reason and timestamp, missing-evidence with rubric clauses and dimension labels, and a structured `narrative` block (strengths, weaknesses, demo readiness, inspection notes).
- Scorecard includes a score-change rail for the latest visible deltas.
- `npm run validate` checks fixture schema, completion, expected score bands, five-lens score coverage, and the required Harrison/Brian harness split on the strong and harness-heavy fixtures.
- `npm run test:reducer` directly checks reducer clamp behavior, headline total scoring, spread/agreement boundaries, stage dedupe, completion state, and malformed event-detail handling.
- `npm run test:local-inspect` generates and validates a Local Path Mode fixture from this repo, including every judge × criterion score delta.
- `npm run test:report` checks Markdown and JSON exports from the strong fixture's final state.

## Verification

Latest local check:

```bash
npm run check
npm audit --audit-level=moderate
npm run smoke:visual
```

Result: passing. `npm run smoke:visual` requires the dev server to be running. Audit reports 0 vulnerabilities. `npm run check` now includes fixture validation, reducer tests, Local Path Mode fixture generation tests, report export tests, typecheck, and production build. Fixture validation reports:

- Strong fixture: 73 events, Phase 0 score 72.7/100, five-lens score 74.9/100, 9.2-point Harrison/Brian harness spread.
- Harness-heavy fixture: 59 events, Phase 0 score 61.0/100, five-lens score 59.6/100, 16.0-point Harrison/Brian harness spread.
- Impact-heavy fixture: 59 events, Phase 0 score 55.5/100, five-lens score 54.4/100, meaningful Sam/Andrej impact split.
- Medium fixture: 61 events, Phase 0 score 48.5/100, five-lens score 49.6/100.
- Weak fixture: 53 events, Phase 0 score 5.0/100, five-lens score 5.3/100.

Visual smoke opens the app in headless system Chrome at desktop and mobile widths, verifies the visible fast replay chip, fills the GitHub URL intake, verifies the demo fixture dropdown is not exposed in the primary flow, checks simplified track switching, checks Local Path Mode against this repo through the fallback drawer, switches back to the strong calibration fixture through Compare Fixtures, checks the advanced panel override, starts the evaluation, waits for completion, opens the Rubric and Judge Report tabs, verifies the final score text, triggers JSON export, checks for horizontal overflow, and writes ignored screenshots to `ledger/visual-smoke-*.png`.

## Known Limits

- GitHub URL Mode and Local Path Mode are both static-only: they read safe files (capped at 120 KB each) but do not execute documented build, test, or install commands. GitHub URL Mode accepts any `https://github.com/<org>/<repo>` URL; the suggestion list in the UI is informational, not a gate.
- Replay evidence is pre-recorded and labeled as replay in the top bar; the report's `What Was Inspected` section says explicitly which mode produced it.
- The GitHub remote still needs to be renamed or recreated as `n3moxyz/ralph-ledger` before a public handoff if the original scaffold remote remains in use.

## Self-Score

| Metric | Status | Notes |
| --- | --- | --- |
| Demo Success | 9/10 | Main flow is URL, three-way track, Start; `Run safe replay demo` is one click from a cold screen; calibration fixtures, advanced panel override, GitHub clone, and static local inspection remain available. |
| Trust Success | 9/10 | Score movements include evidence, confidence, references, judge lens, missing evidence, and report notes; the report's `What Was Inspected` block names exactly which path produced it. |
| Harness Track Success | 9/10 | Spec, prompt, five-fixture five-lens authored deltas, GitHub-clone static inspection, local static inspection, validation, and per-judge report are all inspectable. |
| Technical Success | 9/10 | Build/typecheck/fixture validation/reducer/local-inspect/report tests/audit pass, plus desktop and mobile visual smoke. Verified live clone against `anthropics/claude-code`. |
| Demo Quality Success | 9/10 | Main flow is reliable; safe replay demo is always one click; impact-heavy and harness-heavy fixtures make the panel-split story land without narration. |
