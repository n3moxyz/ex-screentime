import { JUDGES } from "../../evaluator/judges";
import { RUBRIC_BY_ID } from "../../evaluator/rubric";
import type { CriterionId, JudgeId } from "../../evaluator/types";

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
