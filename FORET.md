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

## Open Questions

- Should the GitHub repo be private or public?
- Which exact stack should be used?
- Which dev server port should be reserved in `../PROJECTS.md`?
- Should the MVP include real GitHub cloning, local path evaluation, replay fixtures first, or all three in the first autonomous build pass?
