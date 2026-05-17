# Ralph Ledger Specification

> **Naming:** Product name is **Ralph Ledger**. The repo directory is `ex-screentime` for legacy reasons — ignore it, do not rename anything based on it. The umbrella event is **Ralphthon**; the unattended build runner is **Ralph Loop**. Use these names consistently in code, docs, UI copy, and the final SUBMISSION.md.

## One-Line Pitch

Ralph Ledger is a live, transparent assessment harness for autonomous hackathon submissions: submit a repo, watch a panel of AI judge lenses evaluate it in real time, and get an auditable scorecard backed by evidence.

## Product Goal

Build a generic Ralphthon submission assessor that can evaluate any hackathon repo, not just this project.

A user submits a GitHub repo URL, local repo path, or demo fixture. Ralph Ledger evaluates the submission through a transparent staged process: repo intake, stack detection, documentation review, prompt/spec discovery, verification checks, rubric scoring, panel interpretation, and judge report generation.

The main demo must show the evaluation process unfolding live. Scores should change in real time as evidence is discovered. Every score movement must be inspectable, with the rubric criterion, reason, evidence, deductions, confidence, raw reference, and active judge lens that caused the change.

## Build Order (Walking Skeleton First)

The autonomous build MUST ship Phase 0 end-to-end before starting any Phase 1 work. Phase 0 is the bulletproof demo path; if the run ends at 40% of plan, Phase 0 alone must be demoable.

### Phase 0 — Walking Skeleton (non-negotiable)

Ship this list, in this order, and do not move on until each item is demoable:

1. Replay Fixture Mode (the canonical demo path — see Demo Reliability Modes).
2. One strong fixture event log, deterministic, end-to-end.
3. Live Evaluation View rendering the event stream from the fixture.
4. Scorecard View updating incrementally from `score_delta` events.
5. Two judge lenses only: **Harrison Chase** and **Brian Chesky** (the demo-critical pair — they must visibly disagree on the harness-heavy fixture).
6. Panel Splits View for the dimension where those two disagree.
7. Judge Report View as a static export of the final session state.

When all 7 are working against the strong fixture, Phase 0 is done.

### Phase 1 — Breadth (only after Phase 0 works)

Add in roughly this order, stopping when the time budget tightens:

1. The remaining 3 judges (Sam Altman, Andrej Karpathy, Ilya Sutskever).
2. Medium and weak fixtures.
3. Track presets and custom panel selection.
4. Local Path Mode.
5. Submit / Panel Selection / Evidence Inspector / Rubric views.
6. Remaining event types and stages.

### Phase 2 — Stretch (only if Phase 1 fully landed)

1. GitHub URL Mode (highest-risk path; see Demo Reliability Modes).
2. Harness-heavy and impact-heavy fixtures.
3. Markdown/JSON report export.

Treat "Phase 0 done + most of Phase 1" as a stronger outcome than "Phase 0 + Phase 1 + Phase 2 all partial."

## Codex `/goal` Context

This spec is consumed by Codex's `/goal` function for a multi-hour unattended build. Full agent operating instructions (loop, behavioral constraints, finalization steps) live in a single place: §Autonomous Build Requirements below. Read that section as the runtime contract.

The `/goal` run is successful only if the final repo is both:

1. Product-ready enough to demo live to judges.
2. Process-ready enough that judges can inspect the repo and see strong agent engineering.

## Primary Demo Flow

1. User opens Ralph Ledger.
2. User submits a GitHub repo URL, local repo path, or chooses a demo fixture.
3. User chooses an evaluation track:
   - Overall Ralphthon
   - Impact Track
   - Harness / Skills Track
   - Technical Execution
   - Demo Readiness
4. The app recommends a judge panel based on the selected track and detected project type.
5. User can accept the default panel, choose a track preset, or customize the panel.
6. The app starts evaluating the repo.
7. The app shows live stages:
   - intake
   - stack detection
   - documentation review
   - prompt/spec discovery
   - project structure inspection
   - verification checks
   - rubric scoring
   - panel interpretation
   - report generation
8. The scorecard updates incrementally as evidence is discovered.
9. The user clicks any score to inspect:
   - rubric definition
   - evidence found
   - score changes
   - deductions
   - missing evidence
   - confidence level
   - judge lens
   - raw file, command, or source reference
10. The app ends with a judge-ready report.

The demo is not only "here is a final score." The demo is "watch the autonomous evaluator think, verify, revise, disagree, and explain itself."

## Target Users

- Hackathon judges who want consistent, inspectable scoring.
- Hackathon teams who want pre-submission feedback.
- Agent builders who want evidence that their autonomous workflow was rigorous.
- Hackathon organizers who want a transparent assessment aid rather than an opaque ranking system.

## Core Trust Principle

Ralph Ledger must not be a black-box AI judge.

It must clearly distinguish between:

- Observed evidence: files found, commands passed, tests ran, screenshots exist.
- Inferred judgment: documentation suggests strong impact, demo quality appears high.
- Missing evidence: no autonomous prompt found, no tests found, no setup instructions found.
- User-provided claims: team says agents ran autonomously, team says demo works.
- Judge interpretation: a selected judge lens weights the same evidence differently from another lens.

The app must never pretend it verified something it did not verify.

## Core Product Concept

Ralph Ledger combines two layers:

1. Evidence transparency: what the evaluator found, verified, missed, or inferred.
2. Interpretation transparency: how different judge lenses score the same evidence.

The panel layer is not a gimmick. It exists because rigorous evaluators often agree on evidence but disagree on what matters most. Ralph Ledger makes that disagreement visible.

## Scoring Rubric

Total score: 100 points.

```text
Impact: 20
Technical Execution: 20
Originality: 15
Demo Quality: 15
Harness / Agent Engineering: 30
```

### Impact

Evaluates whether the project solves a meaningful problem for a clear audience.

Evidence examples:

- Clear problem statement.
- Clear target user.
- Useful workflow.
- Strong relevance to Ralphthon or agentic building.
- Practical value beyond a toy demo.

### Technical Execution

Evaluates whether the project is implemented competently and can run.

Evidence examples:

- Install/build/test commands exist.
- Build succeeds.
- Tests pass.
- Type checks pass.
- App has coherent architecture.
- Error states and fallbacks exist.
- Repo avoids unnecessary secrets or brittle setup.

### Originality

Evaluates whether the project has a distinctive concept or approach.

Evidence examples:

- Novel framing.
- Non-obvious interaction model.
- Creative use of agents or assessment.
- Clear differentiation from generic dashboards or CRUD apps.

### Demo Quality

Evaluates whether the project can be shown clearly in a short judging window.

Evidence examples:

- Clear first screen.
- Smooth primary demo flow.
- Seeded data or fixtures.
- Judge-facing report.
- Screenshots or visual evidence.
- README includes demo instructions.

### Harness / Agent Engineering

Evaluates how well the repo supports autonomous agent work.

This is the highest-weighted category because Ralphthon includes a Harness / Skills Track.

Subcriteria:

```text
Spec clarity
Autonomous prompt quality
Task decomposition
Build/test loop evidence
Failure recovery
Evidence logging
Submission/report readiness
Delegation or agent-role design
```

Evidence examples:

- `AGENT_PROMPT.md` or equivalent exists.
- `SPEC.md` or product spec exists.
- Acceptance criteria are explicit.
- Agent instructions include no-human fallback behavior.
- Test/build loops are documented or logged.
- Failures and fixes are recorded.
- Final submission summary exists.
- Repo structure makes agent work inspectable.

## AI Judge Panel

Ralph Ledger includes a selectable AI judge panel. The panel adds interpretation transparency on top of evidence transparency.

Each judge lens has:

- Name.
- Public-role label.
- Home rubric dimension.
- Dimension bias multipliers.
- Evidence preferences.
- Signature red flag.
- Short judging style.
- Source links for public inspiration.
- UI color/icon metadata.

The app should not claim real endorsement by any named person. The judge lenses are public-persona-inspired assessment lenses for a hackathon demo.

## Required Judge Lenses

The MVP judge roster contains five named judge lenses, each selected to cover one core rubric dimension.

### Sam Altman - Impact and Ambition Lens

Home dimension: Impact.

Public-role label: OpenAI CEO / startup scale lens.

Bias multipliers:

```text
Impact x1.30
Originality x1.10
Harness x1.00
Demo x0.95
Technical Execution x0.90
```

Evidence preferences:

- Clear large-market or large-behavior-change thesis.
- Obvious user pain and urgency.
- A path from hackathon demo to durable product.

Signature red flag:

- Project is technically interesting but solves an unclear or low-stakes problem.

Judging style:

- Rewards ambition, clarity of user need, and leverage.
- Penalizes clever tools with no sharp reason to exist.

### Andrej Karpathy - Technical Clarity Lens

Home dimension: Technical Execution.

Public-role label: AI engineer / systems clarity lens.

Bias multipliers:

```text
Technical Execution x1.35
Harness x1.10
Demo x1.00
Originality x0.95
Impact x0.85
```

Evidence preferences:

- Simple architecture with readable code paths.
- Tests, type checks, deterministic fixtures, and reproducible commands.
- Clear separation between core logic and UI.

Signature red flag:

- Demo works only because of brittle magic, unclear state, or untested glue.

Judging style:

- Rewards simple, inspectable engineering.
- Penalizes complexity that hides whether the system actually works.

### Ilya Sutskever - Originality and Intelligence Lens

Home dimension: Originality.

Public-role label: AI research / deep originality lens.

Bias multipliers:

```text
Originality x1.35
Harness x1.15
Technical Execution x1.00
Impact x0.95
Demo x0.85
```

Evidence preferences:

- Non-obvious insight about agents, evaluation, learning, or intelligence.
- Mechanism that improves with iteration or reflection.
- A design that reveals something deeper than the UI surface.

Signature red flag:

- Project is polished but conceptually derivative.

Judging style:

- Rewards depth, recursive evaluation, and new framing.
- Penalizes shallow novelty.

### Brian Chesky - Demo and Product Experience Lens

Home dimension: Demo Quality.

Public-role label: Founder / product storytelling lens.

Bias multipliers:

```text
Demo x1.35
Impact x1.15
Originality x1.00
Technical Execution x0.95
Harness x0.90
```

Evidence preferences:

- Clear first 10 seconds.
- Strong narrative arc through the demo.
- UI that makes the core value obvious without explanation.

Signature red flag:

- Strong backend or harness with a confusing or forgettable user-facing experience.

Judging style:

- Rewards emotional clarity, product taste, and memorable flow.
- Penalizes dashboards that feel generic or require too much narration.

### Harrison Chase - Agent Harness Lens

Home dimension: Harness / Agent Engineering.

Public-role label: LangChain founder / agent workflow lens.

Bias multipliers:

```text
Harness x1.40
Technical Execution x1.10
Originality x1.00
Impact x0.95
Demo x0.85
```

Evidence preferences:

- Explicit agent loop design.
- Tool use, logging, task decomposition, and recovery behavior.
- Evidence that the system can run autonomously and improve through feedback.

Signature red flag:

- Agentic claims without prompt, logs, task graph, or verification evidence.

Judging style:

- Rewards autonomous workflow design and operational rigor.
- Penalizes projects that say "agent" but only use one model call.

## Panel Selection

Panel selection is part of the evaluation flow.

The app must support:

1. Default panel.
2. Track preset panel.
3. Custom panel.

Panel selection is per evaluation only. It should reset on every new evaluation. No user accounts, favorites, or saved panel state are required.

### Default Panel

The default panel contains all five judge lenses:

```text
Sam Altman
Andrej Karpathy
Ilya Sutskever
Brian Chesky
Harrison Chase
```

This is the recommended panel for Overall Ralphthon scoring because it covers all five rubric dimensions.

### Track Presets

The app should offer track presets that change weighting emphasis and UI ordering.

For MVP, track presets may use the same five judges but emphasize different active dimensions. If time allows, presets may visually mark lead judges.

#### Overall Ralphthon

Default panel:

```text
Sam Altman
Andrej Karpathy
Ilya Sutskever
Brian Chesky
Harrison Chase
```

Lead emphasis:

```text
balanced across all dimensions
```

#### Impact Track

Default panel:

```text
Sam Altman
Brian Chesky
Ilya Sutskever
Andrej Karpathy
Harrison Chase
```

Lead emphasis:

```text
Impact
Demo Quality
Originality
```

Evaluation behavior:

- Impact evidence appears first in the UI.
- Product clarity deductions are highlighted.
- Final report starts with user value and practical adoption.

#### Harness / Skills Track

Default panel:

```text
Harrison Chase
Andrej Karpathy
Ilya Sutskever
Sam Altman
Brian Chesky
```

Lead emphasis:

```text
Harness / Agent Engineering
Technical Execution
Originality
```

Evaluation behavior:

- Prompt/spec/log evidence appears first in the UI.
- Build/test loop and autonomous recovery evidence are highlighted.
- Final report starts with harness design and agent process.

#### Technical Execution

Default panel:

```text
Andrej Karpathy
Harrison Chase
Ilya Sutskever
Brian Chesky
Sam Altman
```

Lead emphasis:

```text
Technical Execution
Harness / Agent Engineering
```

Evaluation behavior:

- Command verification and architecture evidence appear first.
- Failed or missing build/test checks are highlighted.

#### Demo Readiness

Default panel:

```text
Brian Chesky
Sam Altman
Andrej Karpathy
Harrison Chase
Ilya Sutskever
```

Lead emphasis:

```text
Demo Quality
Impact
Technical Execution
```

Evaluation behavior:

- First-screen clarity, fixtures, screenshots, and README demo instructions appear first.
- Final report includes a concise demo script.

### Custom Panel

Users can choose any 3 to 5 judge lenses from the roster.

Validation rules:

- Minimum 3 judges.
- Maximum 5 judges.
- At least one selected judge must have a home dimension matching the selected track's lead dimension, unless the user explicitly chooses Overall Ralphthon.
- The UI must show each selected judge's bias multipliers before evaluation starts.

## Consensus Math

Scoring runs on a normalized 0–1 scale so bias multipliers never get silently swallowed by a dimension cap (e.g. Harrison's 1.40× on Harness would saturate at 30 if applied to raw points). Multipliers shape the *spread*, not just the ceiling.

For each judge `j` and rubric dimension `D`:

```text
raw_norm(j, D)      = evidence_score(j, D) / dimension_max(D)   # in [0, 1]
weighted_norm(j, D) = clamp(raw_norm(j, D) * bias(j, D), 0, 1)
judge_score(j, D)   = weighted_norm(j, D) * dimension_max(D)
```

For each rubric dimension `D` and selected panel `P`:

```text
panel_score(D) = mean(judge_score(j, D) for j in P)
```

Dimension maxes:

```text
Impact <= 20
Technical Execution <= 20
Originality <= 15
Demo Quality <= 15
Harness / Agent Engineering <= 30
```

Total:

```text
total_score = sum(panel_score(D) across all 5 dimensions)
```

Total is naturally capped at 100 because each `panel_score(D)` is capped at `dimension_max(D)`.

The clamp at 1.0 happens at the normalized stage, so a judge with a strong bias on a dimension where evidence is already maxed will pin at the ceiling — but a judge with a strong bias on a dimension with mid-strength evidence will visibly pull the panel mean. This is the behavior the Panel Splits view depends on.

No user-adjustable judge weights are required for MVP. Flat panel mean keeps consensus math inspectable and demo-fast.

## Confidence Model

"Confidence" is referenced throughout the rubric, events, and report. Use this single definition everywhere — do not invent per-module variants.

Confidence is a 0.0–1.0 value attached to every evidence item and propagated to score deltas and dimension scores.

```text
1.0  observed     — file exists on disk, or command exited with captured output
0.7  inferred     — derived from documentation, comments, or static reading
0.4  user-claim   — asserted in README/SUBMISSION but not independently checked
0.0  missing      — expected evidence not found; triggers a deduction, not a score
```

Dimension confidence is the mean confidence of the evidence items that contributed to that dimension's score. Report-level confidence is the mean across dimensions, weighted by dimension points.

Missing evidence MUST lower confidence (via inclusion in the mean as 0.0) AND apply a deduction to the score. The two are independent signals — confidence describes *how sure we are*, deductions describe *what was penalized*.

## Where The Panel Splits View

The app must show disagreement as a first-class signal.

For every rubric dimension, the UI should show:

- Consensus level.
- Score spread across the panel.
- Highest judge and rationale.
- Lowest judge and rationale.
- Whether the split is meaningful.
- Resolution note.

Example:

```text
Harness / Agent Engineering
Consensus: medium
Spread: 18-27 / 30

Harrison Chase: 27/30
Reason: Strong prompt, explicit loop design, verification evidence.

Brian Chesky: 18/30
Reason: Harness is strong, but its value is not yet obvious in the live demo.

Resolution note:
The panel agrees the harness exists. The disagreement is whether the demo makes the harness legible quickly enough.
```

When there is no meaningful split, the view still renders and says consensus.

## Score Output Requirements

Each rubric category must produce:

```text
score
weighted score
confidence
evidence found
deductions
missing evidence
raw references
per-judge breakdown
panel agreement level
```

Each score change must explain:

```text
criterion
delta
reason
evidence
confidence
stage
timestamp
judge lens
artifact reference
rubric clause reference
```

Example:

```json
{
  "type": "score_delta",
  "stage": "verification",
  "criterion": "technical_execution",
  "judge": "andrej-karpathy",
  "delta": 1.5,
  "reason": "Build command completed successfully",
  "evidence": ["npm run build exited 0"],
  "confidence": 0.92,
  "artifact_ref": "command:npm run build",
  "rubric_clause_ref": "technical_execution.verification"
}
```

## Evaluator Pipeline

The evaluator should run as staged jobs that emit structured events.

Required stages:

1. Repo Intake
   - Accept GitHub URL, local path, or fixture.
   - Clone or read the repo.
   - Create an evaluation session.

2. Track and Panel Selection
   - Ask user to choose evaluation track.
   - Recommend a panel based on track and, when possible, detected project type.
   - Allow default, track preset, or custom panel.

3. Stack Detection
   - Detect package manager, framework, language, and likely commands.
   - Inspect files such as `package.json`, `vite.config.*`, `next.config.*`, `tsconfig.json`, `pyproject.toml`, `Cargo.toml`, etc.

4. Documentation Review
   - Read key docs such as `README.md`, `AGENTS.md`, `CLAUDE.md`, `FORET.md`, `SPEC.md`, `SUBMISSION.md`.
   - Extract setup instructions, product description, demo instructions, and architecture notes.

5. Prompt and Harness Discovery
   - Look for autonomous prompt/spec/rubric files.
   - Identify evidence of agentic workflow, task planning, evaluation loops, or build logs.

6. Project Structure Inspection
   - Inspect source layout.
   - Identify app entrypoints, scripts, tests, fixtures, schemas, and generated artifacts.

7. Verification Checks
   - Run safe available commands when possible.
   - Prefer commands explicitly documented in README or package scripts.
   - Capture command, exit code, duration, and summary output.
   - If commands are unavailable or fail due to environment constraints, record missing evidence or blocked verification honestly.

8. Scoring
   - Score each rubric category based on collected evidence.
   - Apply each selected judge's bias multipliers.
   - Apply deductions for missing or weak evidence.
   - Assign confidence level.
   - Emit score delta events as evidence changes the score.

9. Panel Interpretation
   - Compute panel consensus.
   - Compute per-judge breakdown.
   - Compute agreement/spread per dimension.
   - Generate resolution notes for meaningful splits.

10. Report Generation
   - Generate final judge-facing assessment.
   - Include scores, explanations, evidence, deductions, missing evidence, confidence, panel consensus, and per-judge breakdown.
   - Make the report viewable in the app and exportable as markdown or JSON if feasible.

## Event Stream

The app should model evaluation as an event stream.

Event types may include:

```text
stage_started
stage_completed
track_selected
panel_recommended
panel_selected
file_found
file_missing
stack_detected
command_started
command_completed
command_failed
evidence_found
deduction_applied
score_delta
judge_score_delta
confidence_changed
panel_split_detected
report_generated
evaluation_completed
```

Every event should include:

```text
id
timestamp
type
stage
message
severity
details
```

The UI should render these events live.

## Required UI Views

### Submit View

Must include:

- GitHub repo URL input.
- Local path input if feasible.
- Fixture picker.
- Evaluation track selector.
- Start evaluation button.
- Short explanation that the evaluator is evidence-based and transparent.

### Panel Selection View

Must include:

- Auto-recommended panel.
- Track preset options.
- Custom judge selection.
- Judge cards with name, home dimension, bias multipliers, evidence preferences, and red flag.
- Validation that 3 to 5 judges are selected.

### Live Evaluation View

Must include:

- Current stage.
- Stage progress.
- Live event feed.
- Currently running checks.
- Active panel.
- Clear distinction between live and replay mode.

### Scorecard View

Must include:

- Total score.
- Score by category.
- Weighted contribution by category.
- Confidence by category.
- Panel consensus by category.
- Per-judge score by category.
- Score changes over time.

### Panel Splits View

Must include:

- Agreement level for each dimension.
- Score spread.
- Highest and lowest judge rationale.
- Resolution note.
- Clear consensus state when no meaningful split exists.

### Evidence Inspector

Must include:

- Evidence grouped by criterion.
- Deductions grouped by criterion.
- Missing evidence.
- Raw file or command references.
- Judge lens that applied each reasoning step.
- Explanation of why each score moved.

### Rubric View

Must include:

- Full public rubric.
- Weights.
- Subcriteria.
- Judge bias multipliers.
- Explanation of how evidence affects scoring.

### Judge Report View

Must include:

- Final score.
- Executive summary.
- Selected track.
- Selected panel.
- Panel consensus.
- Per-judge breakdown.
- Strengths.
- Weaknesses.
- Evidence table.
- Missing evidence.
- Confidence notes.
- Panel disagreement notes.
- Demo readiness.
- Suggested improvements.
- Export option if feasible.

## Demo Reliability Modes

Ralph Ledger supports three input modes, ordered by demo priority.

### Replay Fixture Mode (canonical demo path)

Replays a saved evaluation event log against the same UI and event format as live evaluation.

This is the **default demo path** and the only mode required by Phase 0. The live 3-minute judging demo MUST run in Replay Fixture Mode unless the presenter explicitly opts into a riskier mode. Replay protects the demo from Wi-Fi failure, GitHub rate limits, `npm install` flakiness, and arbitrary-repo execution risk — all of which are real failure modes during a hackathon judging window.

Replay mode must be clearly labeled as replay in the UI so judges are not misled about what was verified live versus pre-recorded.

### Local Path Mode (Phase 1)

Evaluates a repo already available on disk. Useful during development and as a fallback when a real repo needs to be evaluated without network dependency.

### GitHub URL Mode (Phase 2 / stretch)

Evaluates a real repo cloned from a GitHub URL.

This is the highest-risk mode: it depends on network access, GitHub availability, install success, and command execution against unfamiliar code. Per §Non-Goals, Ralph Ledger does not sandbox hostile repos, so this mode is **only safe against known-good repos**. Do not use this mode in a live judging demo unless Phase 0 and Phase 1 are both complete and a tested fallback to Replay Mode is one click away.

## Fixtures

Include at least three fixtures for MVP.

1. Weak submission
   - Minimal docs.
   - No tests.
   - Weak harness.
   - Should score low.

2. Medium submission
   - Runnable app.
   - Basic README.
   - Some tests.
   - Weak or missing autonomous harness evidence.
   - Should score mid-range.

3. Strong submission
   - Clear spec.
   - Strong prompt.
   - Runnable app.
   - Tests/build evidence.
   - Good demo instructions.
   - Strong harness evidence.
   - Should score high.

If time allows, add:

4. Harness-heavy fixture
   - Strong agent harness and logs.
   - Weak demo polish.
   - Should produce a visible split between Harrison Chase and Brian Chesky lenses.

5. Impact-heavy fixture
   - Strong product value.
   - Modest technical novelty.
   - Should produce a visible split between Sam Altman and Ilya Sutskever lenses.

## Technical Direction

Use a local-first stack optimized for hackathon reliability.

Recommended:

```text
React
Vite
TypeScript
Node.js
JSON/JSONL file-backed evaluation data
No database
No auth
No required API keys
```

The MVP should not require external AI APIs. If AI-assisted analysis is added, it must be optional and the app must still work without API keys.

## Suggested Repo Structure

Start small. Create modules when the code in them earns its own file — not before. Phase 0 only needs `src/app/`, `src/evaluator/`, and `src/fixtures/`. Sub-splits (`intake/`, `detection/`, `scoring/`, etc.) should emerge organically as the evaluator pipeline grows; don't scaffold seven empty dirs on day one.

Top-level layout (start here):

```text
AGENT_PROMPT.md
SPEC.md
SUBMISSION.md
FORET.md
README.md

judges/                 # one .md per judge lens, added as judges land
src/
  app/                  # UI: views, components, state
  evaluator/            # pipeline stages, scoring, panel math, reporting
  fixtures/             # replay event logs (start with the strong fixture)

ledger/                 # generated evaluation outputs (gitignored or sample-only)
scripts/                # seed-fixtures, validate-evaluation, generate-report
```

Add `EVAL_RUBRIC.md` and `src/types/` once the rubric and event schemas stabilize. Split `evaluator/` into sub-modules when any single file crosses ~400 lines.

## Autonomous Build Requirements

The final Ralph Loop `/goal` prompt should instruct the agent to:

- Work without asking for human input.
- Make conservative implementation decisions.
- Build in thin vertical slices.
- After every meaningful change, run verification.
- Keep the app runnable throughout.
- Maintain structured evidence logs.
- Score the project against the rubric repeatedly.
- Improve the weakest high-value area after each scoring pass.
- Create demo fixtures early.
- Preserve a reliable replay mode.
- Implement the judge panel runtime experience before expanding judge research artifacts.
- Prioritize demo reliability over scope expansion.
- Update `README.md`, `FORET.md`, `SPEC.md`, and `SUBMISSION.md`.
- Leave clear final status and known limitations.

The autonomous run should use this loop:

```text
1. Read AGENTS.md, SPEC.md, FORET.md, README.md, and any existing project files.
2. Choose a minimal reliable stack if none exists.
3. Create a task graph with acceptance checks.
4. Build the next thin vertical slice.
5. Run the fastest relevant verification.
6. Record what changed, what passed, what failed, and what evidence was produced.
7. Score the current product against this spec's success metrics.
8. Improve the weakest high-value area.
9. Repeat until the time budget is nearly exhausted or all success metrics pass.
10. Finalize by running full verification, updating docs, generating SUBMISSION.md, and leaving demo instructions.
```

The agent should treat a passing build as a checkpoint, not the finish line.

## Acceptance Criteria

Acceptance is defined by §Final Product Success Metrics and §Minimum Score Targets below. The build is accepted when every metric category meets its minimum self-scored target, and Phase 0 (§Build Order) is fully demoable in Replay Fixture Mode.

Do not maintain a separate acceptance bullet list — it will drift from the success metrics. The success metrics are the single source of truth.

## Final Product Success Metrics

The autonomous build should judge itself against these success metrics before stopping. The final `SUBMISSION.md` should report which metrics passed, partially passed, or failed.

### Demo Success

The product is demo-successful when:

- A user can start from the first screen and evaluate a fixture without reading external instructions.
- The primary demo flow completes in under 90 seconds using replay fixture mode.
- The app visibly shows evaluation stages, event feed, score changes, panel consensus, per-judge breakdown, and panel disagreement.
- At least one fixture creates a meaningful disagreement between two judge lenses.
- A judge can click from a final score to the evidence and deduction trail that produced it.
- The final report is understandable as a standalone judge artifact.

### Trust Success

The product is trust-successful when:

- The rubric and judge bias multipliers are visible before or during evaluation.
- Every score movement has a reason and an artifact reference.
- Evidence is labeled as observed, inferred, missing, or user-claim.
- Missing evidence lowers confidence or applies a deduction.
- Panel splits are shown even when the selected judges mostly agree.
- The app clearly labels replay mode as replay mode.

### Harness Track Success

The product is harness-successful when:

- The repo includes a strong autonomous build prompt or prompt draft.
- The repo includes this spec and keeps it aligned with implementation.
- The evaluator produces structured events rather than only final prose.
- Fixtures are deterministic and reusable.
- Verification commands are documented and runnable.
- The repo demonstrates repeated build/test/evaluate/improve loops through logs, docs, commits, or generated reports.

### Technical Success

The product is technically successful when:

- Setup commands are documented.
- The app builds successfully.
- Type checks or equivalent static checks pass.
- Core evaluator/scoring logic has tests or deterministic fixture checks.
- The app can run without secrets, paid APIs, auth, database setup, or production infrastructure.
- The project has a clear file structure that separates UI, evaluator logic, scoring, fixtures, and reporting.

### Demo Quality Success

The product is demo-quality successful when:

- The first screen immediately communicates "submit repo, choose track, watch evaluation."
- The live evaluation view is the visual centerpiece.
- Score movement is visible and legible without narration.
- Panel disagreement is easy to understand.
- The final report gives the presenter a clean 3-minute story.
- There is a safe fallback path if GitHub/network access fails.

### Minimum Score Targets

The final product should aim to satisfy these self-scored targets:

```text
Demo Success: 8/10 or higher
Trust Success: 8/10 or higher
Harness Track Success: 8/10 or higher
Technical Success: 7/10 or higher
Demo Quality Success: 8/10 or higher
```

If any target is not met, the agent should spend remaining time improving the weakest target before adding new features.

## Definition Of Done For The AI Judge Panel

Panel feature DoD is covered by §Final Product Success Metrics (especially Trust Success and Demo Success) plus the Phase 0 / Phase 1 split in §Build Order. The only panel-specific hard requirement not captured elsewhere:

- At least one fixture (the strong / harness-heavy one) MUST produce a meaningful split between Harrison Chase and Brian Chesky on Harness / Agent Engineering. This is the demo's hero moment and is non-negotiable.

## Non-Goals

Ralph Ledger does not need to provide:

- Perfect objective judging.
- Secure sandboxing for arbitrary hostile repos.
- Full static analysis for every language.
- Production multi-user hosting.
- Authentication.
- Database persistence.
- Hidden AI-only scoring.
- Live web scraping of judge sources.
- Real-time source freshness.
- Full real-person simulation.
- Long-running cloud execution.

## Design Tone

The UI should feel like a serious assessment cockpit, not a playful toy.

It should be:

- Clear.
- Transparent.
- Fast to understand.
- Evidence-first.
- Interactive.
- Trustworthy.
- Demo-friendly.

Avoid making the app feel like a generic analytics dashboard. The main drama should be the live evaluation process, changing scorecard, and visible panel disagreement.

## Final Demo Script

A successful demo should sound like this:

1. "Ralphthon asks us to let agents work autonomously. Ralph Ledger evaluates those submissions transparently."
2. "I will submit a repo now."
3. "I can choose the evaluation track. For this one, I will choose Harness / Skills."
4. "Ralph Ledger recommends a judge panel. Harrison Chase and Andrej Karpathy are emphasized because this track cares about harness design and technical execution."
5. "The evaluator is detecting the stack, reading the docs, finding the prompt, and checking whether the project can actually run."
6. "Notice the score is changing as evidence appears. This is not a hidden final judgment."
7. "If I click Technical Execution, I can see exactly why it moved: build passed, tests passed, but no end-to-end test was found."
8. "If I click Harness / Agent Engineering, I can see whether the repo includes a strong autonomous prompt, spec, task decomposition, and build/test loop evidence."
9. "The panel does not always agree. Here, Harrison scores the harness highly, while Brian penalizes the demo because the value is not immediately visible."
10. "At the end, judges get this report: score, evidence, deductions, missing signals, confidence, and per-judge breakdown."
11. "The point is not to replace judges. The point is to make autonomous hackathon judging inspectable and evidence-based."
