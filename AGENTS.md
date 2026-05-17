# Ralph Ledger

## Overview

Ralph Ledger is a transparent Ralphthon submission assessor. It evaluates hackathon repos through staged evidence gathering, judge-lens scoring, panel interpretation, and exportable reports.

## First Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

The dev server uses `http://127.0.0.1:5173/`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite app |
| `npm run validate` | Validate replay fixture shape, five-lens score coverage, score bands, and required panel split |
| `npm run test:reducer` | Run direct reducer behavior tests |
| `npm run test:local-inspect` | Validate the generated Local Path Mode fixture from this repo |
| `npm run test:report` | Validate Markdown/JSON report exports from the strong fixture |
| `npm run typecheck` | Run TypeScript static checks |
| `npm run build` | Build the production app |
| `npm run smoke:visual` | With the dev server and system Chrome available, run desktop/mobile headless Chrome smoke tests |
| `npm run check` | Run validation, evaluator tests, typecheck, and build |

## Architecture

Tech stack:

- React 18
- Vite
- TypeScript
- Node/npm
- JSON fixture data
- No database, auth, or required API keys

Source layout:

- `src/app/` — Ralph Ledger UI views and styling.
- `src/evaluator/` — rubric, judge lenses, event reducer, scoring helpers, and report generation.
- `src/fixtures/` — deterministic replay event logs.
- `scripts/` — local validation scripts.
- `judges/` — judge-lens notes for the implemented panel.
- `vite.config.ts` — Vite setup plus dev-only read-only Local Path Mode middleware.

## Conventions

- Keep secrets in `.env.local`; never commit real credentials.
- Keep `.env.example` current whenever environment variables change.
- Update `FORET.md` after meaningful features, refactors, or bug fixes.
- Preserve Replay Fixture Mode as the reliable demo path.
- Keep Local Path Mode static-only until an explicit command-execution trust gate exists.
- Keep score movements tied to evidence, confidence, judge lens, artifact reference, and rubric clause.
- Follow the workspace conventions in `/Users/edwardtmc/dev/ClaudeProjs/AGENTS.md`.
