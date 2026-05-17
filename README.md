# Ralph Ledger

Ralph Ledger is a live, transparent assessment cockpit for Ralphthon hackathon submissions. The current build includes the Phase 0 walking skeleton from `SPEC.md`: replay a deterministic evaluation fixture, watch evidence arrive, inspect score movements, see the Harrison Chase / Brian Chesky harness split, and read the final judge report. It also includes the main Phase 1 cockpit features: authored five-lens replay scoring, track-aware panel presets, custom panel selection, static Local Path Mode, and fixture comparison.

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
| `npm run typecheck` | Run TypeScript static checks |
| `npm run build` | Build the production bundle |
| `npm run smoke:visual` | With the dev server and system Chrome available, verify desktop/mobile viewports and save ignored screenshots |
| `npm run check` | Run fixture validation, typecheck, and production build |

## Demo Path

1. Open the app.
2. Choose `Strong Harness Replay`, `Medium Submission Replay`, or `Weak Submission Replay`.
3. Keep `Phase 0 Split Demo` for the canonical Harrison/Brian demo, or choose a five-lens panel preset.
4. Start replay mode.
5. Watch the stage strip, event feed, scorecard, evidence inspector, panel split, and judge report update from the same structured events.
6. Open `Compare fixtures` to see why strong, medium, and weak fixtures all exist.
7. Export the final report as Markdown or JSON from the Judge Report tab.

Replay mode is intentionally the canonical demo path. It avoids Wi-Fi, GitHub, install, and arbitrary-code-execution risk during judging. The strong fixture is the main Phase 0 demo because it creates the required Harrison/Brian harness disagreement; the medium and weak fixtures are calibration paths.

All five judge lenses now have authored score-delta events in the strong, medium, and weak replay fixtures. `Phase 0 Split Demo` keeps the original Harrison/Brian canonical score stable, while the track presets use the same event stream with broader panels.

## Local Path Mode

Local Path Mode is static-only and read-only. Enter an absolute local repo path, click `Inspect static path`, then start the generated event stream. Ralph Ledger inspects safe docs, manifests, scripts, fixtures, judge files, and source layout. It does **not** run install, build, test, or arbitrary repo commands.
