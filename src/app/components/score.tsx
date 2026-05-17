import { getJudgeCriterionScore, replayEvents } from "../../evaluator/reducer";
import { RUBRIC, RUBRIC_BY_ID } from "../../evaluator/rubric";
import type { CriterionId, JudgeId, LedgerEvent } from "../../evaluator/types";

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
