import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Split,
} from "lucide-react";
import { JUDGES } from "../evaluator/judges";
import {
  getAgreementLevel,
  getCriterionPanelScore,
  getJudgeCriterionScore,
  getPanelSpread,
  getTotalScore,
  replayEvents,
} from "../evaluator/reducer";
import { RUBRIC, RUBRIC_BY_ID } from "../evaluator/rubric";
import type { CriterionId, JudgeId, LedgerEvent } from "../evaluator/types";
import { replayFixtures } from "../fixtures/fixtures";

const fmt = (value: number, digits = 1) => value.toFixed(digits);

const fixtureRoles: Record<string, { role: string; purpose: string }> = {
  "strong-harness-replay": {
    role: "Main demo",
    purpose: "High-scoring harness run with the required Harrison/Brian split.",
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

export function ScoreMovementRail({ events }: { events: LedgerEvent[] }) {
  const movements = events.filter((event) => event.type === "score_delta").slice(-18);
  return (
    <div className="movement-rail" aria-label="Score changes over time" aria-live="polite">
      <div className="movement-rail__header">
        <strong>Score changes over time</strong>
        <small>{movements.length} visible deltas</small>
      </div>
      {movements.length === 0 ? (
        <p className="muted">Score deltas will appear here as evidence is replayed.</p>
      ) : (
        <div className="movement-rail__ticks">
          {movements.map((event) => {
            const details = event.details as { delta?: number; criterion?: CriterionId };
            const delta = details.delta ?? 0;
            const criterion = details.criterion;
            return (
              <span
                key={event.id}
                className={delta < 0 ? "is-negative" : "is-positive"}
                title={`${criterion ? RUBRIC_BY_ID[criterion].label : "Score"} ${
                  delta > 0 ? "+" : ""
                }${fmt(delta)}`}
                style={{ height: `${Math.max(16, Math.min(54, Math.abs(delta) * 5))}px` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function getJudgeTotal(
  state: ReturnType<typeof replayEvents>,
  judgeId: JudgeId,
) {
  return RUBRIC.reduce(
    (sum, item) => sum + getJudgeCriterionScore(state.criteria[item.id], judgeId),
    0,
  );
}

export function JudgeCard({ judgeId, compact = false }: { judgeId: JudgeId; compact?: boolean }) {
  const judge = JUDGES[judgeId];
  return (
    <article className={`judge-card ${compact ? "judge-card--compact" : ""}`}>
      <div className="judge-card__top">
        <span style={{ background: judge.color }}>{judge.marker}</span>
        <div>
          <h4>{judge.name}</h4>
          <p>{judge.role}</p>
        </div>
      </div>
      {!compact && (
        <>
          <p>{judge.style}</p>
          <small>Red flag: {judge.redFlag}</small>
        </>
      )}
      <div className="bias-grid">
        {Object.entries(judge.bias).map(([criterion, value]) => (
          <span key={criterion}>
            {RUBRIC_BY_ID[criterion as CriterionId].label.replace(" / Agent Engineering", "")}{" "}
            {value.toFixed(2)}x
          </span>
        ))}
      </div>
    </article>
  );
}

export function PanelPicker({
  activePanel,
  preset,
  valid,
  onToggleJudge,
}: {
  activePanel: JudgeId[];
  preset: string;
  valid: boolean;
  onToggleJudge: (judgeId: JudgeId) => void;
}) {
  const isCustom = preset === "Custom";
  const judgeIds = Object.keys(JUDGES) as JudgeId[];
  return (
    <div className={`panel-picker ${isCustom ? "is-custom" : ""}`}>
      <div className="panel-picker__summary">
        <strong>{activePanel.length} active lenses</strong>
        <span>{isCustom ? "Custom panel" : "Preset panel"}</span>
      </div>
      {isCustom && (
        <div className="panel-picker__choices">
          {judgeIds.map((judgeId) => {
            const judge = JUDGES[judgeId];
            const checked = activePanel.includes(judgeId);
            const disabled = !checked && activePanel.length >= 5;
            return (
              <label className="panel-choice" key={judgeId}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleJudge(judgeId)}
                />
                <span style={{ background: judge.color }}>{judge.marker}</span>
                <p>
                  <strong>{judge.name}</strong>
                  <small>{RUBRIC_BY_ID[judge.homeDimension].label}</small>
                </p>
              </label>
            );
          })}
        </div>
      )}
      {!valid && (
        <p className="panel-picker__error">Choose 3 to 5 evaluators for a custom panel.</p>
      )}
    </div>
  );
}

export function TrackFocusCard({
  focus,
}: {
  focus: { label: string; evidence: string; reportLead: string; leadCriteria: CriterionId[] };
}) {
  return (
    <div className="track-focus-card" aria-label="Track focus">
      <strong>{focus.label}</strong>
      <p>{focus.evidence}</p>
      <small>{focus.reportLead}</small>
    </div>
  );
}

export function EvaluatorBench({ activePanel }: { activePanel: JudgeId[] }) {
  const judgeIds = Object.keys(JUDGES) as JudgeId[];
  return (
    <div className="evaluator-bench" aria-label="Full evaluator roster">
      <div className="evaluator-bench__header">
        <strong>Full roster</strong>
        <span>5 lenses</span>
      </div>
      <div className="bench-list">
        {judgeIds.map((judgeId) => {
          const judge = JUDGES[judgeId];
          const isActive = activePanel.includes(judgeId);
          return (
            <div className={`bench-row ${isActive ? "is-active" : ""}`} key={judgeId}>
              <span style={{ background: judge.color }}>{judge.marker}</span>
              <p>
                <strong>{judge.name}</strong>
                <small>{RUBRIC_BY_ID[judge.homeDimension].label}</small>
              </p>
              <em>{isActive ? "Scoring now" : "Available"}</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EventFeed({ events }: { events: LedgerEvent[] }) {
  const visible = events.slice(-13).reverse();
  if (visible.length === 0) {
    return (
      <div className="empty-feed">
        <Clock3 size={20} aria-hidden="true" />
        <p>Ready to run the evaluation stream.</p>
      </div>
    );
  }

  return (
    <ol className="event-feed" aria-live="polite" aria-relevant="additions text">
      {visible.map((event) => (
        <li className={`event event--${event.severity}`} key={event.id}>
          <span className="event__icon">
            {event.severity === "warning" ? (
              <AlertTriangle size={16} />
            ) : event.severity === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <Activity size={16} />
            )}
          </span>
          <div>
            <p>{event.message}</p>
            <small>
              {event.stage.replace(/_/g, " ")} · {event.type.replace(/_/g, " ")}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RunningChecks({ events }: { events: LedgerEvent[] }) {
  const commandEvents = events
    .filter(
      (event) =>
        event.type === "command_started" ||
        event.type === "command_completed" ||
        event.type === "command_failed",
    )
    .slice(-3);

  return (
    <div className="checks-strip" aria-label="Currently running checks">
      <div className="checks-strip__label">
        <Clock3 size={15} />
        <strong>Checks</strong>
      </div>
      {commandEvents.length === 0 ? (
        <span className="check-chip">Waiting for verification stage</span>
      ) : (
        commandEvents.map((event) => (
          <span className={`check-chip check-chip--${event.severity}`} key={event.id}>
            {String(event.details?.command ?? event.message)}
          </span>
        ))
      )}
    </div>
  );
}

export function EvidenceInspector({
  criterionId,
  stateCriterion,
}: {
  criterionId: CriterionId;
  stateCriterion: ReturnType<typeof replayEvents>["criteria"][CriterionId];
}) {
  const rubric = RUBRIC_BY_ID[criterionId];
  const latestChanges = stateCriterion.changes.slice().reverse();

  return (
    <section className="inspector" aria-label="Evidence inspector">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evidence inspector</p>
          <h3>{rubric.label}</h3>
        </div>
        <span className="pill">{rubric.max} pts</span>
      </div>
      <p className="muted">{rubric.short}</p>

      <div className="evidence-columns">
        <EvidenceColumn title="Evidence found" tone="positive" items={stateCriterion.evidence} />
        <EvidenceColumn title="Deductions" tone="negative" items={stateCriterion.deductions} />
        <EvidenceColumn title="Missing evidence" tone="negative" items={stateCriterion.missing} />
      </div>

      <div className="change-log">
        <h4>Score movements</h4>
        {latestChanges.length === 0 ? (
          <p className="muted">No score movement yet for this criterion.</p>
        ) : (
          latestChanges.map((change) => (
            <article className="change-item" key={change.id}>
              <strong>
                {change.delta > 0 ? "+" : ""}
                {fmt(change.delta)} · {JUDGES[change.judge].name}
              </strong>
              <p>{change.reason}</p>
              <small>
                {change.evidenceKind} · confidence {Math.round(change.confidence * 100)}% ·{" "}
                {change.artifactRef} · {change.rubricClauseRef}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function EvidenceColumn({
  title,
  items,
  tone,
}: {
  title: string;
  tone: "positive" | "negative";
  items: ReturnType<typeof replayEvents>["criteria"][CriterionId]["evidence"];
}) {
  return (
    <div className={`evidence-column evidence-column--${tone}`}>
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        items.map((item) => (
          <article className="evidence-item" key={item.id}>
            <strong>{item.kind}</strong>
            <p>{item.label}</p>
            <small>{item.artifactRef}</small>
          </article>
        ))
      )}
    </div>
  );
}

export function PanelSplitsView({
  state,
  panel,
}: {
  state: ReturnType<typeof replayEvents>;
  panel: JudgeId[];
}) {
  const split = state.panelSplits.harness_agent_engineering;
  const criterion = state.criteria.harness_agent_engineering;
  const spread = getPanelSpread(criterion, panel);

  return (
    <aside className="split-panel" aria-label="Panel splits view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Panel splits</p>
          <h3>Harness disagreement</h3>
        </div>
        <Split size={22} aria-hidden="true" />
      </div>

      <div className="split-meter">
        <span>
          {fmt(spread.min)}/{RUBRIC_BY_ID.harness_agent_engineering.max}
        </span>
        <div>
          <i style={{ left: `${(spread.min / 30) * 100}%` }} />
          <i style={{ left: `${(spread.max / 30) * 100}%` }} />
        </div>
        <span>
          {fmt(spread.max)}/{RUBRIC_BY_ID.harness_agent_engineering.max}
        </span>
      </div>

      {split ? (
        <div className="split-copy">
          <p>
            <strong>{JUDGES[split.highestJudge].name}</strong>: {split.highestReason}
          </p>
          <p>
            <strong>{JUDGES[split.lowestJudge].name}</strong>: {split.lowestReason}
          </p>
          <blockquote>{split.resolutionNote}</blockquote>
        </div>
      ) : state.completed ? (
        <div className="split-copy">
          <p>
            <strong>Consensus:</strong> no meaningful split detected. Current agreement is{" "}
            {getAgreementLevel(criterion, panel)} with a {fmt(spread.spread)} point spread.
          </p>
          <blockquote>
            The panel is reading the same evidence similarly for this fixture, so Ralph Ledger
            reports consensus instead of manufacturing drama.
          </blockquote>
        </div>
      ) : (
        <p className="muted">
          Waiting for panel interpretation. This view will still render consensus if no meaningful
          split appears.
        </p>
      )}
    </aside>
  );
}

export function FixtureComparison({
  activeFixtureId,
  panel,
  onChooseFixture,
}: {
  activeFixtureId: string;
  panel: JudgeId[];
  onChooseFixture: (fixtureId: string) => void;
}) {
  const rows = replayFixtures.map((item) => {
    const finalState = replayEvents(item.events, item.events.length);
    const total = getTotalScore(finalState, panel);
    const harnessSpread = getPanelSpread(finalState.criteria.harness_agent_engineering, panel);
    return {
      fixture: item,
      total,
      harnessSpread,
      role: fixtureRoles[item.meta.id]?.role ?? "Replay fixture",
      purpose: fixtureRoles[item.meta.id]?.purpose ?? item.meta.summary,
    };
  });

  return (
    <section className="comparison-view" aria-label="Fixture comparison">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Fixture comparison</p>
          <h3>Calibration across strong, medium, and weak replays</h3>
        </div>
        <span className="pill">{panel.length} lens panel</span>
      </div>
      <p className="muted">
        Fixtures are not extra demos for their own sake. They prove the evaluator can separate a
        strong harness submission from a middling runnable app and a weak missing-evidence repo.
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
                {active ? "Selected" : "Use fixture"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function RubricView({ panel }: { panel: JudgeId[] }) {
  const allJudgeIds = Object.keys(JUDGES) as JudgeId[];
  return (
    <section className="rubric-view" aria-label="Rubric view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Public rubric</p>
          <h3>Weights and lens multipliers</h3>
        </div>
      </div>
      <div className="rubric-grid">
        {RUBRIC.map((item) => (
          <article className="rubric-item" key={item.id}>
            <strong>
              {item.label} <span>{item.max} pts</span>
            </strong>
            <p>{item.short}</p>
            <ul>
              {item.clauses.map((clause) => (
                <li key={clause}>{clause}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="confidence-model" aria-label="Confidence model">
        <h4>Confidence model</h4>
        <div>
          <span>
            <strong>1.0</strong> observed
          </span>
          <span>
            <strong>0.7</strong> inferred
          </span>
          <span>
            <strong>0.4</strong> user claim
          </span>
          <span>
            <strong>0.0</strong> missing
          </span>
        </div>
        <p>
          Missing evidence lowers confidence and applies deductions; the two signals are tracked
          separately.
        </p>
      </div>
      <div className="lens-section-heading">
        <h4>Judge lenses</h4>
        <p>
          The selected panel changes the scorecard and report. These are
          public-persona-inspired assessment lenses; no endorsement is implied.
        </p>
      </div>
      <div className="lens-grid">
        {allJudgeIds.map((judgeId) => (
          <div className="lens-wrap" key={judgeId}>
            <JudgeCard judgeId={judgeId} />
            <span className={`lens-status ${panel.includes(judgeId) ? "is-active" : ""}`}>
              {panel.includes(judgeId) ? "Active now" : "Available"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportView({
  markdown,
  reportJson,
  fixtureId,
  completed,
}: {
  markdown: string;
  reportJson: unknown;
  fixtureId: string;
  completed: boolean;
}) {
  const downloadReport = (format: "md" | "json") => {
    const isJson = format === "json";
    const body = isJson ? JSON.stringify(reportJson, null, 2) : markdown;
    const blob = new Blob([body], {
      type: isJson ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ralph-ledger-${fixtureId}-report.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="report-view" aria-label="Judge report view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Judge report</p>
          <h3>Static export of final session state</h3>
        </div>
        <div className="report-actions">
          <button className="button" onClick={() => downloadReport("md")} disabled={!completed}>
            <Download size={16} />
            Markdown
          </button>
          <button className="button" onClick={() => downloadReport("json")} disabled={!completed}>
            <Download size={16} />
            JSON
          </button>
        </div>
      </div>
      {completed ? (
        <pre>{markdown}</pre>
      ) : (
        <div className="report-pending">
          <Clock3 size={22} />
          <p>Report generation is waiting for the replay evaluation to complete.</p>
        </div>
      )}
    </section>
  );
}
