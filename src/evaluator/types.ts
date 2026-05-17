export type EvidenceKind = "observed" | "inferred" | "user-claim" | "missing";

export type EventSeverity = "info" | "success" | "warning" | "critical";

export type EventType =
  | "stage_started"
  | "stage_completed"
  | "track_selected"
  | "panel_recommended"
  | "panel_selected"
  | "file_found"
  | "file_missing"
  | "stack_detected"
  | "command_started"
  | "command_completed"
  | "command_failed"
  | "evidence_found"
  | "deduction_applied"
  | "score_delta"
  | "judge_score_delta"
  | "confidence_changed"
  | "panel_split_detected"
  | "report_generated"
  | "evaluation_completed";

export type StageId =
  | "intake"
  | "track_panel"
  | "stack_detection"
  | "documentation_review"
  | "prompt_discovery"
  | "structure_inspection"
  | "verification"
  | "scoring"
  | "panel_interpretation"
  | "report_generation";

export type CriterionId =
  | "impact"
  | "technical_execution"
  | "originality"
  | "demo_quality"
  | "harness_agent_engineering";

export type JudgeId =
  | "sam-altman"
  | "andrej-karpathy"
  | "ilya-sutskever"
  | "brian-chesky"
  | "harrison-chase";

export interface LedgerEvent {
  id: string;
  timestamp: string;
  type: EventType;
  stage: StageId;
  message: string;
  severity: EventSeverity;
  details?: Record<string, unknown>;
}

export interface ScoreDeltaDetails extends Record<string, unknown> {
  criterion: CriterionId;
  judge: JudgeId;
  delta: number;
  reason: string;
  evidence: string[];
  confidence: number;
  evidence_kind: EvidenceKind;
  artifact_ref: string;
  rubric_clause_ref: string;
}

export interface EvidenceItem {
  id: string;
  criterion: CriterionId;
  judge?: JudgeId;
  kind: EvidenceKind;
  label: string;
  reason: string;
  confidence: number;
  artifactRef: string;
  rubricClauseRef: string;
  stage: StageId;
  timestamp: string;
}

export interface ScoreChange {
  id: string;
  criterion: CriterionId;
  judge: JudgeId;
  delta: number;
  reason: string;
  evidence: string[];
  confidence: number;
  evidenceKind: EvidenceKind;
  artifactRef: string;
  rubricClauseRef: string;
  stage: StageId;
  timestamp: string;
}

export interface CriterionState {
  criterion: CriterionId;
  perJudge: Record<JudgeId, number>;
  evidence: EvidenceItem[];
  deductions: EvidenceItem[];
  missing: EvidenceItem[];
  confidenceValues: number[];
  changes: ScoreChange[];
}

export interface PanelSplit {
  criterion: CriterionId;
  consensus: "high" | "medium" | "low";
  meaningful: boolean;
  highestJudge: JudgeId;
  highestReason: string;
  lowestJudge: JudgeId;
  lowestReason: string;
  resolutionNote: string;
}

export interface EvaluationState {
  visibleEvents: LedgerEvent[];
  currentStage: StageId;
  completedStages: StageId[];
  criteria: Record<CriterionId, CriterionState>;
  panelSplits: Partial<Record<CriterionId, PanelSplit>>;
  completed: boolean;
}

export interface FixtureMeta {
  id: string;
  name: string;
  mode: "replay" | "local-static";
  track: string;
  panel: JudgeId[];
  repoLabel: string;
  summary: string;
  submittedRepoUrl?: string;
  sourcePath?: string;
  expectedScoreBand?: {
    min: number;
    max: number;
  };
  requiredHarnessSplit?: boolean;
}

export interface ReplayFixture {
  meta: FixtureMeta;
  events: LedgerEvent[];
}
