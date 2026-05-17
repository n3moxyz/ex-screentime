# Ralph Ledger

Ralph Ledger is a live, transparent assessment cockpit for Ralphthon hackathon submissions. The current build includes the Phase 0 walking skeleton from `SPEC.md`: run a deterministic evaluation stream, watch evidence arrive, inspect score movements, see the Harrison Chase / Brian Chesky harness split, and read the final judge report. It also includes the main Phase 1 cockpit features plus Phase 2 GitHub URL Mode: authored five-lens replay scoring, track-aware panels, custom panel override, static inspection, fixture comparison, and public GitHub clone intake.

## Local Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The dev server runs at `http://127.0.0.1:5173/`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run validate` | Validate replay fixture schema, five-lens scoring coverage, score bands, and required Harrison/Brian split |
| `npm run test:reducer` | Run direct reducer unit tests for clamps, agreement/spread boundaries, and malformed event details |
| `npm run test:local-inspect` | Generate a static Local Path Mode fixture from this repo and validate its judge/rubric coverage |
| `npm run test:report` | Verify Markdown and JSON report exports against the strong fixture's final state |
| `npm run typecheck` | Run TypeScript static checks |
| `npm run build` | Build the production bundle |
| `npm run smoke:visual` | With the dev server and system Chrome available, verify desktop/mobile viewports and save ignored screenshots |
| `npm run check` | Run fixture validation, evaluator unit tests, typecheck, and production build |

## Primary Flow

1. Open the app.
2. Paste a GitHub repo URL.
3. Choose one evaluation track: `Harness`, `Impact`, or `Overall Ralphthon`.
4. Start the evaluation.
5. Watch the stage strip, event feed, scorecard, evidence inspector, panel split, and judge report update from the same structured events.
6. Export the final report as Markdown or JSON from the Judge Report tab.

The main screen intentionally hides fixture choice. Pasting a public GitHub URL and pressing Start performs a depth-1 clone into a temp directory, runs the read-only static inspection pipeline, and deletes the temp directory. Ralph Ledger never executes repo code.

The strong replay fixture remains the one-click safe baseline because it creates the required Harrison/Brian harness disagreement and avoids Wi-Fi, GitHub, install, and arbitrary-code-execution risk during judging. The medium, weak, harness-heavy, and impact-heavy fixtures remain available in `Compare fixtures` as calibration paths.

Track selection now picks the evaluator panel automatically. `Panel details` is an advanced override for calibration or custom lens testing; it is not part of the normal user path.

The top bar includes a visible replay speed toggle so live demos no longer need to remember the hidden `?speed=fast` URL switch.

All five judge lenses now have authored score-delta events in the strong, medium, and weak replay fixtures. `Phase 0 Split Demo` keeps the original Harrison/Brian canonical score stable, while the track presets use the same event stream with broader panels.

## Static Inspection

GitHub URL Mode and the Local Path Mode engine are static-only and read-only. They inspect safe docs, manifests, scripts, fixtures, judge files, and source layout. They do **not** run install, build, test, hooks, submodules, or arbitrary repo commands. The standalone Local Path UI is no longer in the primary surface, but the local inspection endpoint and fixture generator remain covered by `npm run test:local-inspect`.
