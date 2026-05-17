# FORET — ex-screentime

> **F**oundation **O**f **R**eference, **E**xperience & **T**echnical context

## What Is This?

`ex-screentime` is now the working repo for **Ralph Ledger**, a live, transparent assessment harness for autonomous hackathon submissions.

Ralph Ledger's core demo is: paste a GitHub repo URL, choose Harness, Impact, or Overall Ralphthon, watch an AI judge panel evaluate the submission in real time, inspect score changes, evidence, deductions, confidence, and panel disagreement, then export a judge-ready report.

## Current State

- Local checkout currently exists under `/Users/edwardtmc/dev/ClaudeProjs/projects/ex-screentime`.
- Product direction is defined in `SPEC.md`.
- Phase 0 walking skeleton is implemented as a local Vite/React/TypeScript app.
- Canonical safe baseline is Replay Fixture Mode using JSON fixtures in `src/fixtures/`, but the primary intake now starts with a GitHub URL field.
- Fixture set now includes strong, medium, and weak submissions for calibration.
- The app has a live event feed, incremental scorecard, evidence inspector, rubric view, panel split view, and in-app judge report.
- The canonical `Phase 0 Split Demo` panel still uses Harrison Chase and Brian Chesky, preserving the required harness-vs-demo disagreement.
- All five evaluator lenses now have authored per-event replay score deltas in the strong, medium, and weak fixtures.
- Three primary tracks are now selectable: Harness, Impact, and Overall Ralphthon.
- Track selection automatically picks the evaluator panel; advanced panel details still support Phase 0 split and custom 3 to 5 lens testing.
- Track presets reorder the scorecard around the selected track's lead evidence.
- Local Path Mode exists as a conservative static inspection path behind the `Local static fallback` drawer. It reads safe docs, manifests, source layout, scripts, fixtures, and judge files through Vite dev middleware and emits the same event stream without executing repo commands.
- Local Path Mode logic lives in `src/evaluator/local-inspect.ts` and imports the shared judge/rubric constants instead of duplicating them in Vite config.
- Fixture selection has been removed from the primary sidebar. The strong fixture is the hidden default baseline; medium and weak remain available through the `Compare fixtures` tab to explain calibration.
- Replay speed is visible as a top-bar control instead of only being hidden behind `?speed=fast`.
- Reducer unit tests cover score clamping, spread/agreement thresholds, malformed `score_delta` details, and malformed `panel_split_detected` details.
- No database, auth, external AI API, or required secrets are used.

## Codebase Structure

```text
.
├── AGENT_PROMPT.md                 # Ralph Loop autonomous build prompt
├── AGENTS.md                       # Project instructions for Codex
├── CLAUDE.md                       # Claude-facing pointer to AGENTS.md
├── EVAL_RUBRIC.md                  # Public rubric summary
├── FORET.md                        # Living technical context
├── SPEC.md                         # Ralph Ledger product and build specification
├── SUBMISSION.md                   # Judge-facing submission summary
├── judges/                         # Implemented judge lens notes
├── scripts/reducer-unit.mjs        # Direct reducer behavior tests
├── scripts/validate-fixture.mjs    # Fixture/schema/score validation
├── scripts/validate-scoring.mjs    # Five-lens score coverage and band validation
├── src/app/                        # React UI, view components, and split styles
├── src/evaluator/                  # Event reducer, rubric, judges, report, and local inspection logic
├── src/fixtures/                   # Replay event log data
├── README.md                       # Human-facing setup and demo overview
├── .env.example                    # Environment template
└── .gitignore                      # Local/generated files ignored by git
```

## Decisions

- Started with a minimal repo scaffold, then selected a local-first React/Vite/TypeScript stack for Phase 0.
- Keep the default branch as `main` to match sibling projects.
- Use `n3moxyz/ex-screentime` as the expected GitHub repository path.
- Build Ralph Ledger as a generic submission assessor, not a self-assessment-only tool.
- Use an evidence-first trust model: every score should trace back to observed evidence, inference, missing evidence, user claims, or judge interpretation.
- Treat `SPEC.md` as the artifact that will be submitted with a final Codex `/goal` prompt for a multi-hour autonomous build/test/evaluate/improve loop.
- Add a five-lens AI judge panel for interpretation transparency:
  - Sam Altman: impact and ambition
  - Andrej Karpathy: technical clarity
  - Ilya Sutskever: originality and intelligence
  - Brian Chesky: demo and product experience
  - Harrison Chase: agent harness
- Support track-aware panels for Overall Ralphthon, Impact Track, and Harness / Skills Track.
- Keep `Phase 0 Split Demo` as a preset even after five-lens presets, because it protects the original judging demo and final score expectation.
- Keep the normal user path simple: GitHub URL, three-way evaluation track, Start.
- Keep Local Path Mode static-only until a trust gate and command-capture model are designed.
- Keep `vite.config.ts` as a thin middleware wrapper; evaluator logic should live under `src/evaluator/`.
- Build Phase 0 before broadening: replay fixture, live evaluation, scorecard, Harrison/Brian panel split, and judge report.
- Use `npm run validate` to guard each fixture's event schema, expected score band, completion event, and the strong fixture's required Harrison/Brian harness disagreement.
- Use `npm run test:reducer` to guard reducer math and detail validation directly.

## UI Audit Pass (2026-05-17)

Ran `/audit` on the Ralph Ledger cockpit and applied every P1–P3 finding in commit `23e4243`. The audit started at 13/20 (Acceptable); estimated post-fix score is 18/20 (Excellent). Keep these patterns when extending the UI:

- **Token discipline.** Every card surface goes through `var(--card-bg)`; every circular judge marker uses `color: var(--marker-fg)`. Never inline `#fffaf1` or `color: white` — the audit explicitly flagged 20+ such drift instances. Token set lives at the top of `src/app/styles/base.css`.
- **Focus-visible is a baseline.** `base.css` ships a `--focus-ring` (light-bg) and `--focus-ring-on-dark` (used on `.button--primary` and the active tab). New interactive elements inherit the baseline automatically; only override when the background is dark.
- **Touch targets ≥ 44 px** for buttons, inputs, selects, summary toggles, tab buttons, and the panel-choice label. `.pill` is 32 px when static and 36 px when rendered as a button (`button.pill`). Don't shrink these to "look tighter."
- **Tabs use WAI-ARIA Tabs pattern.** The deck inspector is `role="tablist"` with roving `tabIndex`, arrow/Home/End keyboard handler (`handleTabKey` in `App.tsx`), and a `tabRefs` map for `.focus()` calls. The deck content is `role="tabpanel"` with `tabIndex={0}` so the panel is reachable via Tab after a tab is activated. Never go back to a `<nav>` wrapping styled buttons.
- **Stage progress is an `<ol>`.** `aria-current="step"` marks the in-progress stage; `.stage-step.is-done span::after` paints a `✓` so screen-reader-free users with color-vision deficiency can still distinguish done from current.
- **Memoize fixture replays.** `FIXTURE_FINAL_STATES` at the top of `components.tsx` precomputes each fixture's final reducer state at module load. `FixtureComparison` wraps the per-panel scoring in `useMemo([panel])`. If you add fixture sorts or new comparison columns, keep the data inside the same memo.
- **Font weights snap to 100-step.** Drop 750/760/850 — they round inconsistently across system fonts. Use 700 / 800 / 900.
- **Smallest text floor is 0.72 rem** for any label colored with `var(--muted)`. Below that, contrast on `var(--card-bg)` fails AAA and feels noisy.

## Spec Hardening (2026-05-17)

`SPEC.md` was reviewed before its first `/goal` run and tightened in five places. Each change exists to prevent a specific failure mode of the unattended build — keep them in mind when editing the spec further.

1. **Phase 0 / Walking Skeleton ordering** (§Build Order). Without it, the agent would spread thin across all 5 judges, 7 views, 9 stages, and ship a shallow version of everything. Phase 0 forces 2 judges (Harrison + Brian), Replay mode, and 3 core views to be demoable end-to-end before anything else.
2. **Replay Fixture Mode promoted to canonical demo path** (§Demo Reliability Modes). GitHub URL Mode is now Phase 2 / stretch. Cloning + `npm install` against an unknown repo during a 3-min judging window is the single highest-risk path; Replay protects against Wi-Fi, GitHub, and install failures and is the only mode required by Phase 0.
3. **Consensus math normalized to 0–1** (§Consensus Math). Original formula applied `bias × raw_points` then capped at dimension max — Harrison's 1.40× on a Harness/30 dimension would silently saturate and kill the Panel Splits view's hero moment. New formula clamps after normalization so bias multipliers shape the spread, not just the ceiling.
4. **Confidence Model defined once** (§Confidence Model). "Confidence" was referenced 14× across rubric, events, and report with no definition. Now: 1.0 observed / 0.7 inferred / 0.4 user-claim / 0.0 missing. Single source of truth so the agent doesn't invent per-module variants.
5. **Acceptance Criteria + Panel DoD collapsed** into pointers at §Final Product Success Metrics. Three overlapping checklists would have drifted; the Success Metrics block is self-scorable and is now the single bar for "done".

Plus naming guardrail at the top: product is **Ralph Ledger**, the directory is `ex-screentime` for legacy reasons — do not rename anything based on the directory.

## Open Questions

- Should the GitHub repo be private or public?
- Which dev server port should be reserved in `../PROJECTS.md`?
- Should Local Path Mode run only static inspection first, or also execute documented commands after an explicit trust gate?
- If the cockpit grows further, which extracted app components should become feature folders?

## Resolved Questions

- **Which input mode should the MVP build first?** Replay Fixture Mode, per Phase 0 of §Build Order. Local Path is Phase 1, GitHub URL is Phase 2.
- **Which stack is used?** React + Vite + TypeScript + Node/npm + JSON fixture data, with no DB, auth, or API keys required.
- **When should Phase 1 replace projected Sam/Andrej/Ilya scoring with authored per-event replay deltas?** Done in the strong, medium, and weak replay fixtures.
- **Should Local Path Mode run only static inspection first?** Yes. It is now static-only and command execution remains deferred behind a future trust gate.

## Verification Notes

- `npm run check` passes: fixture validation, reducer unit tests, TypeScript typecheck, and Vite production build.
- `npm audit --audit-level=moderate` reports 0 vulnerabilities after upgrading to Vite 8.
- `npm run smoke:visual` passes with the dev server running; it covers desktop and mobile headless Chrome, visible fast replay chip, GitHub URL intake, hidden fixture dropdown verification, simplified track switching, Local Path Mode through the fallback drawer, fixture switching through Compare Fixtures, advanced panel override, Rubric/Report tabs, JSON export, final report score text, horizontal overflow checks, and ignored screenshots in `ledger/`.
- Fixture validation now rejects malformed score deltas, invalid evidence kinds, empty artifact/rubric references, non-string evidence items, missing stage completion, out-of-band fixture scores, and weak Harrison/Brian harness splits.
- Scoring validation requires authored score coverage for every judge and rubric dimension and checks Phase 0 plus five-lens score bands.
