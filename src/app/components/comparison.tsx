import { useMemo } from "react";
import {
  getPanelSpread,
  getTotalScore,
  replayEvents,
} from "../../evaluator/reducer";
import type { JudgeId } from "../../evaluator/types";
import { replayFixtures } from "../../fixtures/fixtures";

const fmt = (value: number, digits = 1) => value.toFixed(digits);

const FIXTURE_FINAL_STATES = replayFixtures.map((item) => ({
  fixture: item,
  finalState: replayEvents(item.events, item.events.length),
}));

const fixtureRoles: Record<string, { role: string; purpose: string }> = {
  "strong-harness-replay": {
    role: "Main demo",
    purpose: "High-scoring harness run with the required Harrison/Brian split.",
  },
  "harness-heavy-replay": {
    role: "Harness-vs-demo split",
    purpose:
      "Very strong agent process with a thin demo surface. Harrison and Andrej score it highly; Brian penalizes because the rigor never reaches the user.",
  },
  "impact-heavy-replay": {
    role: "Impact-vs-novelty split",
    purpose:
      "Strong product story with thin originality and harness evidence. Sam and Brian score it high while Ilya and Andrej hold back.",
  },
  "medium-submission-replay": {
    role: "Calibration",
    purpose: "Checks that runnable-but-light submissions land in the middle.",
  },
  "weak-submission-replay": {
    role: "Low-end guardrail",
    purpose: "Checks that missing docs, commands, and harness evidence score low.",
  },
};

export function FixtureComparison({
  activeFixtureId,
  panel,
  onChooseFixture,
}: {
  activeFixtureId: string;
  panel: JudgeId[];
  onChooseFixture: (fixtureId: string) => void;
}) {
  const rows = useMemo(
    () =>
      FIXTURE_FINAL_STATES.map(({ fixture: item, finalState }) => {
        const total = getTotalScore(finalState, panel);
        const harnessSpread = getPanelSpread(
          finalState.criteria.harness_agent_engineering,
          panel,
        );
        return {
          fixture: item,
          total,
          harnessSpread,
          role: fixtureRoles[item.meta.id]?.role ?? "Replay fixture",
          purpose: fixtureRoles[item.meta.id]?.purpose ?? item.meta.summary,
        };
      }),
    [panel],
  );

  return (
    <section className="comparison-view" aria-label="Fixture comparison">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Calibration band</p>
          <h3>Where does this score sit?</h3>
        </div>
        <span className="pill">{panel.length} lens panel</span>
      </div>
      <p className="muted">
        Five reference submissions with deliberately different shapes. Compare your current run's
        score against them to gauge what it means — is it harness-strong, demo-strong, missing
        evidence, or something in between? Click <strong>Load fixture</strong> on any card to
        replay it through the same cockpit.
      </p>
      <div className="comparison-grid">
        {rows.map(({ fixture: item, total, harnessSpread, role, purpose }) => {
          const expected = item.meta.expectedScoreBand;
          const active = item.meta.id === activeFixtureId;
          return (
            <article
              className={`comparison-card ${active ? "is-active" : ""}`}
              key={item.meta.id}
            >
              <div className="comparison-card__top">
                <div>
                  <strong>{role}</strong>
                  <h4>{item.meta.name}</h4>
                </div>
                <span>{fmt(total)}</span>
              </div>
              <p>{purpose}</p>
              <div className="comparison-card__facts">
                <span>
                  Expected {expected?.min ?? 0}-{expected?.max ?? 100}
                </span>
                <span>{item.events.length} events</span>
                <span>Harness spread {fmt(harnessSpread.spread)}</span>
              </div>
              <button
                className="button"
                disabled={active}
                onClick={() => onChooseFixture(item.meta.id)}
              >
                {active ? "Currently loaded" : "Load fixture"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
