# FORET — ex-screentime

> **F**oundation **O**f **R**eference, **E**xperience & **T**echnical context

## What Is This?

`ex-screentime` is now the working repo for **Ralph Ledger**, a live, transparent assessment harness for autonomous hackathon submissions.

Ralph Ledger's core demo is: submit a GitHub repo, local path, or fixture; choose an evaluation track; watch an AI judge panel evaluate the submission in real time; inspect score changes, evidence, deductions, confidence, and panel disagreement; then export a judge-ready report.

## Current State

- Local checkout currently exists under `/Users/edwardtmc/dev/ClaudeProjs/projects/ex-screentime`.
- Repo scaffold includes `README.md`, `AGENTS.md`, `CLAUDE.md`, `.env.example`, `.gitignore`, `SPEC.md`, and this FORET.
- Product direction is defined in `SPEC.md`.
- No application code, package manager, database, or deployment target has been selected yet.

## Codebase Structure

```text
.
├── AGENTS.md      # Project instructions for Codex
├── CLAUDE.md      # Claude-facing pointer to AGENTS.md
├── FORET.md       # Living technical context
├── SPEC.md        # Ralph Ledger product and build specification
├── README.md      # Human-facing project overview
├── .env.example   # Environment template
└── .gitignore     # Local/generated files ignored by git
```

## Decisions

- Start with a minimal repo scaffold before selecting a stack.
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
- Support track-aware panel presets for Overall Ralphthon, Impact Track, Harness / Skills Track, Technical Execution, and Demo Readiness.

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
- Which exact stack should be used? (SPEC suggests React + Vite + TypeScript + Node + JSON/JSONL file-backed data, no DB, no auth, no API keys required.)
- Which dev server port should be reserved in `../PROJECTS.md`?

## Resolved Questions

- **Which input mode should the MVP build first?** Replay Fixture Mode, per Phase 0 of §Build Order. Local Path is Phase 1, GitHub URL is Phase 2.
