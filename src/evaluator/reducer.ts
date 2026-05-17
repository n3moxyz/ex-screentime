import { JUDGES } from "./judges";
import { RUBRIC, RUBRIC_BY_ID, STAGES } from "./rubric";
import type {
  CriterionId,
  CriterionState,
  EvaluationState,
  EvidenceItem,
  JudgeId,
  LedgerEvent,
  PanelSplit,
  ScoreChange,
  ScoreDeltaDetails,
} from "./types";

const judgeIds = Object.keys(JUDGES) as JudgeId[];

const emptyPerJudge = () =>
  Object.fromEntries(judgeIds.map((judge) => [judge, 0])) as Record<JudgeId, number>;

const createCriterionState = (criterion: CriterionId): CriterionState => ({
  criterion,
  perJudge: emptyPerJudge(),
  evidence: [],
  deductions: [],
  missing: [],
  confidenceValues: [],
  changes: [],
});

export const createInitialState = (): EvaluationState => ({
  visibleEvents: [],
  currentStage: "intake",
  completedStages: [],
  criteria: Object.fromEntries(RUBRIC.map((item) => [item.id, createCriterionState(item.id)])) as Record<
    CriterionId,
    CriterionState
  >,
  panelSplits: {},
  completed: false,
});

const isScoreDeltaDetails = (details: LedgerEvent["details"]): details is ScoreDeltaDetails => {
  if (!details) return false;
  return (
    typeof details.criterion === "string" &&
    typeof details.judge === "string" &&
    typeof details.delta === "number" &&
    typeof details.reason === "string" &&
    Array.isArray(details.evidence) &&
    typeof details.confidence === "number" &&
    typeof details.evidence_kind === "string" &&
    typeof details.artifact_ref === "string" &&
    typeof details.rubric_clause_ref === "string"
  );
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const addEvidenceFromScoreDelta = (
  event: LedgerEvent,
  details: ScoreDeltaDetails,
): EvidenceItem => ({
  id: `${event.id}-evidence`,
  criterion: details.criterion,
  judge: details.judge,
  kind: details.evidence_kind,
  label: details.evidence.join("; "),
  reason: details.reason,
  confidence: details.confidence,
  artifactRef: details.artifact_ref,
  rubricClauseRef: details.rubric_clause_ref,
  stage: event.stage,
  timestamp: event.timestamp,
});

export const applyEvent = (state: EvaluationState, event: LedgerEvent): EvaluationState => {
  const next: EvaluationState = {
    ...state,
    visibleEvents: [...state.visibleEvents, event],
    criteria: { ...state.criteria },
    panelSplits: { ...state.panelSplits },
  };

  if (event.stage) {
    next.currentStage = event.stage;
  }

  if (event.type === "stage_completed" && !next.completedStages.includes(event.stage)) {
    next.completedStages = [...next.completedStages, event.stage];
  }

  if (event.type === "score_delta" && isScoreDeltaDetails(event.details)) {
    const details = event.details;
    const criterion = next.criteria[details.criterion];
    const max = RUBRIC_BY_ID[details.criterion].max;
    const previous = criterion.perJudge[details.judge] ?? 0;
    const change: ScoreChange = {
      id: event.id,
      criterion: details.criterion,
      judge: details.judge,
      delta: details.delta,
      reason: details.reason,
      evidence: details.evidence,
      confidence: details.confidence,
      evidenceKind: details.evidence_kind,
      artifactRef: details.artifact_ref,
      rubricClauseRef: details.rubric_clause_ref,
      stage: event.stage,
      timestamp: event.timestamp,
    };
    const evidence = addEvidenceFromScoreDelta(event, details);

    next.criteria[details.criterion] = {
      ...criterion,
      perJudge: {
        ...criterion.perJudge,
        [details.judge]: clamp(previous + details.delta, 0, max),
      },
      evidence: details.delta > 0 ? [...criterion.evidence, evidence] : criterion.evidence,
      deductions: details.delta < 0 ? [...criterion.deductions, evidence] : criterion.deductions,
      missing:
        details.evidence_kind === "missing" ? [...criterion.missing, evidence] : criterion.missing,
      confidenceValues: [...criterion.confidenceValues, details.confidence],
      changes: [...criterion.changes, change],
    };
  }

  if (event.type === "panel_split_detected" && event.details) {
    const details = event.details as Partial<PanelSplit>;
    if (details.criterion) {
      next.panelSplits[details.criterion] = details as PanelSplit;
    }
  }

  if (event.type === "evaluation_completed") {
    next.completed = true;
  }

  return next;
};

export const replayEvents = (events: LedgerEvent[], count: number): EvaluationState =>
  events.slice(0, count).reduce(applyEvent, createInitialState());

export const getStageProgress = (state: EvaluationState) => {
  const currentIndex = STAGES.findIndex((stage) => stage.id === state.currentStage);
  const completedCount = state.completedStages.length;
  return {
    currentIndex: Math.max(currentIndex, 0),
    completedCount,
    percent: Math.round((completedCount / STAGES.length) * 100),
  };
};

export const getCriterionConfidence = (criterion: CriterionState) => {
  if (criterion.confidenceValues.length === 0) return 0;
  const total = criterion.confidenceValues.reduce((sum, value) => sum + value, 0);
  return total / criterion.confidenceValues.length;
};

export const getJudgeCriterionScore = (criterion: CriterionState, judge: JudgeId) => {
  return criterion.perJudge[judge] ?? 0;
};

export const getCriterionPanelScore = (criterion: CriterionState, panel: JudgeId[]) => {
  if (panel.length === 0) return 0;
  return (
    panel.reduce((sum, judge) => sum + getJudgeCriterionScore(criterion, judge), 0) /
    panel.length
  );
};

export const getPanelSpread = (criterion: CriterionState, panel: JudgeId[]) => {
  const values = panel.map((judge) => getJudgeCriterionScore(criterion, judge));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
    spread: Number.isFinite(max - min) ? max - min : 0,
  };
};

export const getAgreementLevel = (criterion: CriterionState, panel: JudgeId[]) => {
  const max = RUBRIC_BY_ID[criterion.criterion].max;
  const { spread } = getPanelSpread(criterion, panel);
  const ratio = spread / max;
  if (ratio >= 0.25) return "low";
  if (ratio >= 0.12) return "medium";
  return "high";
};

export const getTotalScore = (state: EvaluationState, panel: JudgeId[]) =>
  RUBRIC.reduce((sum, item) => sum + getCriterionPanelScore(state.criteria[item.id], panel), 0);
