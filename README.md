# Ralph Ledger

Ralph Ledger is a live, transparent assessment cockpit for Ralphthon hackathon submissions. The current build includes the Phase 0 walking skeleton from `SPEC.md`: run a deterministic evaluation stream, watch evidence arrive, inspect score movements, see the Harrison Chase / Brian Chesky harness split, and read the final judge report. It also includes the main Phase 1 cockpit features: authored five-lens replay scoring, track-aware panels, custom panel override, static Local Path Mode, and fixture comparison.

The repo directory is still `ex-screentime` for legacy reasons; the product name is Ralph Ledger.

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
| `npm run typecheck` | Run TypeScript static checks |
| `npm run build` | Build the production bundle |
| `npm run smoke:visual` | With the dev server and system Chrome available, verify desktop/mobile viewports and save ignored screenshots |
| `npm run check` | Run fixture validation, reducer unit tests, typecheck, and production build |

## Primary Flow

1. Open the app.
2. Paste a GitHub repo URL.
3. Choose one evaluation track: `Harness`, `Impact`, or `Overall Ralphthon`.
4. Start the evaluation.
5. Watch the stage strip, event feed, scorecard, evidence inspector, panel split, and judge report update from the same structured events.
6. Export the final report as Markdown or JSON from the Judge Report tab.

The main screen intentionally hides fixture choice. The strong replay fixture is the default safe baseline because it creates the required Harrison/Brian harness disagreement and avoids Wi-Fi, GitHub, install, and arbitrary-code-execution risk during judging. The medium and weak fixtures remain available only in `Compare fixtures` as calibration paths.

GitHub URL fetching is still Phase 2. In the current build, the pasted URL is captured for the user flow while the hidden strong replay baseline drives the live score stream.

Track selection now picks the evaluator panel automatically. `Panel details` is an advanced override for calibration or custom lens testing; it is not part of the normal user path.

The top bar includes a visible replay speed toggle so live demos no longer need to remember the hidden `?speed=fast` URL switch.

All five judge lenses now have authored score-delta events in the strong, medium, and weak replay fixtures. `Phase 0 Split Demo` keeps the original Harrison/Brian canonical score stable, while the track presets use the same event stream with broader panels.

## Local Path Mode

Local Path Mode is static-only and read-only. Open `Local static fallback`, enter an absolute local repo path, click `Inspect static path`, then start the generated event stream. Ralph Ledger inspects safe docs, manifests, scripts, fixtures, judge files, and source layout. It does **not** run install, build, test, or arbitrary repo commands.
