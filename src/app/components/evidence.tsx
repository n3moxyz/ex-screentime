import { Split } from "lucide-react";
import { JUDGES } from "../../evaluator/judges";
import {
  getAgreementLevel,
  getPanelSpread,
  replayEvents,
} from "../../evaluator/reducer";
import { RUBRIC_BY_ID } from "../../evaluator/rubric";
import type { CriterionId, JudgeId } from "../../evaluator/types";

const fmt = (value: number, digits = 1) => value.toFixed(digits);

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
