import { CheckCircle2, FileText, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { JUDGES } from "../../evaluator/judges";
import {
  getCriterionConfidence,
  getCriterionPanelScore,
  getJudgeCriterionScore,
  getTotalScore,
  replayEvents,
} from "../../evaluator/reducer";
import { RUBRIC, RUBRIC_BY_ID } from "../../evaluator/rubric";
import type { CriterionId, EvaluationState, JudgeId, LedgerEvent } from "../../evaluator/types";

const fmt = (value: number, digits = 1) => value.toFixed(digits);

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
        <div className="movement-rail__ticks" role="list">
          {movements.map((event) => {
            const details = event.details as { delta?: number; criterion?: CriterionId };
            const delta = details.delta ?? 0;
            const criterion = details.criterion;
            const label = `${criterion ? RUBRIC_BY_ID[criterion].label : "Score"} ${
              delta > 0 ? "+" : ""
            }${fmt(delta)}`;
            return (
              <span
                key={event.id}
                className={delta < 0 ? "is-negative" : "is-positive"}
                role="listitem"
                aria-label={label}
                title={label}
                style={{ height: `${Math.max(16, Math.min(54, Math.abs(delta) * 5))}px` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function getJudgeTotal(state: ReturnType<typeof replayEvents>, judgeId: JudgeId) {
  return RUBRIC.reduce(
    (sum, item) => sum + getJudgeCriterionScore(state.criteria[item.id], judgeId),
    0,
  );
}

type DeckId = "evidence" | "rubric" | "compare" | "report";

const summarizeDimensions = (state: EvaluationState, panel: JudgeId[]) =>
  RUBRIC.map((item) => {
    const criterion = state.criteria[item.id];
    const score = getCriterionPanelScore(criterion, panel);
    return {
      id: item.id,
      label: item.label,
      max: item.max,
      score,
      ratio: item.max === 0 ? 0 : score / item.max,
      confidence: getCriterionConfidence(criterion),
      topEvidence: [...criterion.changes]
        .filter((change) => change.delta > 0)
        .sort((a, b) => b.delta - a.delta)[0],
      firstMissing: criterion.missing[0],
    };
  });

export function ScoreSummary({
  state,
  panel,
  track,
  onOpenDeck,
  onSelectCriterion,
}: {
  state: EvaluationState;
  panel: JudgeId[];
  track: string;
  onOpenDeck: (deck: DeckId) => void;
  onSelectCriterion: (criterion: CriterionId) => void;
}) {
  const total = getTotalScore(state, panel);
  const dims = summarizeDimensions(state, panel);
  const strongest = [...dims].sort((a, b) => b.ratio - a.ratio)[0];
  const weakest = [...dims].sort((a, b) => a.ratio - b.ratio)[0];
  const split = Object.values(state.panelSplits).find((entry) => entry?.meaningful);
  const avgConfidence =
    dims.reduce((sum, dim) => sum + dim.confidence, 0) / Math.max(dims.length, 1);

  const openCriterion = (criterion: CriterionId) => {
    onSelectCriterion(criterion);
    onOpenDeck("evidence");
  };

  return (
    <section className="score-summary" aria-label="Why this score">
      <div className="score-summary__header">
        <div>
          <p className="eyebrow">Why this score</p>
          <h3>
            {fmt(total)} <span>/ 100</span>
          </h3>
        </div>
        <dl className="score-summary__facts">
          <div>
            <dt>Track</dt>
            <dd>{track}</dd>
          </div>
          <div>
            <dt>Panel</dt>
            <dd>{panel.length} lenses</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{Math.round(avgConfidence * 100)}%</dd>
          </div>
        </dl>
      </div>

      <ul className="score-summary__bullets">
        {strongest && (
          <li>
            <span className="score-summary__icon score-summary__icon--up" aria-hidden="true">
              <TrendingUp size={16} />
            </span>
            <p>
              <strong>Strongest — {strongest.label}</strong> ({fmt(strongest.score)}/{strongest.max}).{" "}
              {strongest.topEvidence
                ? `${JUDGES[strongest.topEvidence.judge].name}: ${strongest.topEvidence.reason}`
                : "Most evidence accumulated here."}
            </p>
            <button
              type="button"
              className="score-summary__link"
              onClick={() => openCriterion(strongest.id)}
            >
              Inspect
            </button>
          </li>
        )}
        {weakest && weakest.id !== strongest?.id && (
          <li>
            <span className="score-summary__icon score-summary__icon--down" aria-hidden="true">
              <TrendingDown size={16} />
            </span>
            <p>
              <strong>Weakest — {weakest.label}</strong> ({fmt(weakest.score)}/{weakest.max}).{" "}
              {weakest.firstMissing
                ? `Missing: ${weakest.firstMissing.label}`
                : weakest.topEvidence
                  ? `Best signal still light: ${weakest.topEvidence.reason}`
                  : "No positive evidence recorded."}
            </p>
            <button
              type="button"
              className="score-summary__link"
              onClick={() => openCriterion(weakest.id)}
            >
              Inspect
            </button>
          </li>
        )}
        {split ? (
          <li>
            <span className="score-summary__icon score-summary__icon--split" aria-hidden="true">
              <Users size={16} />
            </span>
            <p>
              <strong>Panel splits on {RUBRIC_BY_ID[split.criterion].label}.</strong>{" "}
              {JUDGES[split.highestJudge].name} highest; {JUDGES[split.lowestJudge].name} lowest.{" "}
              {split.resolutionNote}
            </p>
            <button
              type="button"
              className="score-summary__link"
              onClick={() => openCriterion(split.criterion)}
            >
              Inspect
            </button>
          </li>
        ) : (
          <li>
            <span className="score-summary__icon score-summary__icon--ok" aria-hidden="true">
              <CheckCircle2 size={16} />
            </span>
            <p>
              <strong>Panel agrees on this run.</strong> No meaningful dimension split was detected
              across the selected lenses.
            </p>
          </li>
        )}
      </ul>

      <div className="score-summary__actions">
        <button
          type="button"
          className="button"
          onClick={() => onOpenDeck("evidence")}
        >
          <Search size={14} aria-hidden="true" />
          Open evidence inspector
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onOpenDeck("report")}
        >
          <FileText size={14} aria-hidden="true" />
          Open judge report
        </button>
      </div>
    </section>
  );
}
