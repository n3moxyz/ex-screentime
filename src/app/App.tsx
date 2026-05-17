import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Clock3,
  FileText,
  Gauge,
  GitBranch,
  Pause,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Split,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { JUDGES, PHASE_ZERO_PANEL, TRACK_PRESETS } from "../evaluator/judges";
import { generateReportJson, generateReportMarkdown } from "../evaluator/report";
import { RUBRIC, RUBRIC_BY_ID, STAGES } from "../evaluator/rubric";
import {
  getAgreementLevel,
  getCriterionConfidence,
  getCriterionPanelScore,
  getJudgeCriterionScore,
  getPanelSpread,
  getStageProgress,
  getTotalScore,
  replayEvents,
} from "../evaluator/reducer";
import type { CriterionId, JudgeId, LedgerEvent, ReplayFixture } from "../evaluator/types";
import { getFixtureById, replayFixtures } from "../fixtures/fixtures";

const getReplayDelayMs = () => {
  if (typeof window === "undefined") return 620;
  return new URLSearchParams(window.location.search).get("speed") === "fast" ? 35 : 620;
};

const fmt = (value: number, digits = 1) => value.toFixed(digits);

const criterionIcon: Record<CriterionId, string> = {
  impact: "IM",
  technical_execution: "TE",
  originality: "OR",
  demo_quality: "DQ",
  harness_agent_engineering: "HA",
};

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

const trackOptions = [
  "Harness / Skills Track",
  "Overall Ralphthon",
  "Impact Track",
  "Technical Execution",
  "Demo Readiness",
];

const panelPresetOptions = ["Phase 0 Split Demo", ...trackOptions, "Custom"];

const trackGuidance: Record<
  string,
  { leadCriteria: CriterionId[]; label: string; evidence: string; reportLead: string }
> = {
  "Harness / Skills Track": {
    leadCriteria: ["harness_agent_engineering", "technical_execution", "originality"],
    label: "Harness evidence first",
    evidence: "Prompt, spec, verification loop, recovery notes, and report readiness.",
    reportLead: "Final report opens with harness design and agent process.",
  },
  "Overall Ralphthon": {
    leadCriteria: [
      "impact",
      "technical_execution",
      "originality",
      "demo_quality",
      "harness_agent_engineering",
    ],
    label: "Balanced rubric",
    evidence: "All dimensions stay in standard rubric order.",
    reportLead: "Final report balances user value, execution, novelty, demo, and harness.",
  },
  "Impact Track": {
    leadCriteria: ["impact", "demo_quality", "originality"],
    label: "Impact evidence first",
    evidence: "Problem clarity, audience urgency, workflow usefulness, and adoption path.",
    reportLead: "Final report opens with user value and practical adoption.",
  },
  "Technical Execution": {
    leadCriteria: ["technical_execution", "harness_agent_engineering", "demo_quality"],
    label: "Verification evidence first",
    evidence: "Stack detection, architecture, build/test checks, and deterministic fixtures.",
    reportLead: "Final report opens with runnable proof and engineering risks.",
  },
  "Demo Readiness": {
    leadCriteria: ["demo_quality", "impact", "technical_execution"],
    label: "Demo evidence first",
    evidence: "First-screen clarity, seeded data, replay reliability, screenshots, and report flow.",
    reportLead: "Final report includes a concise judging-window story.",
  },
};

const getTrackFocus = (track: string) => trackGuidance[track] ?? trackGuidance["Harness / Skills Track"];

export function App() {
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState(replayFixtures[0].meta.id);
  const [localPath, setLocalPath] = useState("");
  const [localFixture, setLocalFixture] = useState<ReplayFixture | null>(null);
  const [localStatus, setLocalStatus] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const fixture = localFixture ?? (getFixtureById(selectedFixtureId) as ReplayFixture);
  const [selectedCriterion, setSelectedCriterion] =
    useState<CriterionId>("harness_agent_engineering");
  const [track, setTrack] = useState(replayFixtures[0].meta.track);
  const [panelPreset, setPanelPreset] = useState("Phase 0 Split Demo");
  const [panel, setPanel] = useState<JudgeId[]>(PHASE_ZERO_PANEL);
  const [activeDeck, setActiveDeck] = useState<"evidence" | "rubric" | "compare" | "report">(
    "evidence",
  );
  const replayDelayMs = useMemo(getReplayDelayMs, []);
  const focus = getTrackFocus(track);

  const state = useMemo(() => replayEvents(fixture.events, cursor), [cursor, fixture.events]);
  const sessionMeta = useMemo(() => ({ ...fixture.meta, track }), [fixture.meta, track]);
  const orderedRubric = useMemo(() => {
    const focused = focus.leadCriteria
      .map((criterionId) => RUBRIC_BY_ID[criterionId])
      .filter(Boolean);
    const rest = RUBRIC.filter((item) => !focus.leadCriteria.includes(item.id));
    return [...focused, ...rest];
  }, [focus.leadCriteria]);
  const totalScore = getTotalScore(state, panel);
  const progress = getStageProgress(state);
  const selected = state.criteria[selectedCriterion];
  const report = useMemo(
    () => generateReportMarkdown(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const reportJson = useMemo(
    () => generateReportJson(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const hasStarted = cursor > 0;
  const panelIsValid =
    panelPreset !== "Custom" || (panel.length >= 3 && panel.length <= 5);

  useEffect(() => {
    if (!running) return;
    if (cursor >= fixture.events.length) {
      setRunning(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setCursor((value) => Math.min(value + 1, fixture.events.length));
    }, replayDelayMs);

    return () => window.clearTimeout(timeout);
  }, [cursor, fixture.events.length, replayDelayMs, running]);

  const startReplay = () => {
    if (cursor >= fixture.events.length) {
      setCursor(0);
      setActiveDeck("evidence");
      setSelectedCriterion(focus.leadCriteria[0]);
    }
    setRunning(true);
  };

  const resetReplay = () => {
    setRunning(false);
    setCursor(0);
    setSelectedCriterion(focus.leadCriteria[0]);
    setActiveDeck("evidence");
  };

  const chooseFixture = (fixtureId: string) => {
    const nextFixture = getFixtureById(fixtureId);
    setLocalFixture(null);
    setLocalStatus("");
    setSelectedFixtureId(nextFixture.meta.id);
    setTrack(nextFixture.meta.track);
    setRunning(false);
    setCursor(0);
    setSelectedCriterion("harness_agent_engineering");
    setActiveDeck("evidence");
  };

  const chooseTrack = (nextTrack: string) => {
    const nextFocus = getTrackFocus(nextTrack);
    setTrack(nextTrack);
    setPanelPreset(nextTrack);
    setPanel(TRACK_PRESETS[nextTrack] ?? PHASE_ZERO_PANEL);
    setSelectedCriterion(nextFocus.leadCriteria[0]);
    setActiveDeck("evidence");
    setRunning(false);
    setCursor(0);
  };

  const inspectLocalPath = async () => {
    if (!localPath.trim()) {
      setLocalStatus("Enter an absolute local repo path first.");
      return;
    }
    setLocalLoading(true);
    setLocalStatus("Inspecting safe files only; no commands will run.");
    try {
      const response = await fetch("/api/local-inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: localPath.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Local inspection failed.");
      }
      const nextFixture = payload as ReplayFixture;
      setLocalFixture(nextFixture);
      setTrack(nextFixture.meta.track);
      setPanelPreset(nextFixture.meta.track);
      setPanel(TRACK_PRESETS[nextFixture.meta.track] ?? TRACK_PRESETS["Harness / Skills Track"]);
      setSelectedCriterion(getTrackFocus(nextFixture.meta.track).leadCriteria[0]);
      setActiveDeck("evidence");
      setRunning(false);
      setCursor(0);
      setLocalStatus("Static inspection ready. Start the event stream when you want to watch it.");
    } catch (error) {
      setLocalStatus(error instanceof Error ? error.message : "Local inspection failed.");
    } finally {
      setLocalLoading(false);
    }
  };

  const choosePanelPreset = (nextPreset: string) => {
    setPanelPreset(nextPreset);
    if (nextPreset !== "Custom") {
      setPanel(TRACK_PRESETS[nextPreset] ?? PHASE_ZERO_PANEL);
    } else if (panel.length < 3) {
      setPanel(TRACK_PRESETS[track] ?? TRACK_PRESETS["Overall Ralphthon"]);
    }
    setRunning(false);
    setCursor(0);
  };

  const toggleJudge = (judgeId: JudgeId) => {
    if (panelPreset !== "Custom") {
      return;
    }
    setPanel((current) => {
      if (current.includes(judgeId)) {
        return current.filter((item) => item !== judgeId);
      }
      if (current.length >= 5) {
        return current;
      }
      return [...current, judgeId];
    });
    setRunning(false);
    setCursor(0);
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ralphthon assessor</p>
          <h1>Ralph Ledger</h1>
        </div>
        <div className="topbar__meta" aria-label="Replay status">
          <span className="pill pill--replay">
            {fixture.meta.mode === "local-static" ? "Static Local Path Mode" : "Replay Fixture Mode"}
          </span>
          <span className="pill">No API keys</span>
          <span className="pill">{state.completed ? "Report ready" : "Live scoring"}</span>
        </div>
      </header>

      <section className="workspace" aria-label="Ralph Ledger evaluation workspace">
        <aside className="intake" aria-label="Submit and panel setup">
          <div className="section-heading">
            <GitBranch size={18} aria-hidden="true" />
            <span>Submit</span>
          </div>

          <label className="field">
            <span>GitHub repo URL</span>
            <input placeholder="Phase 2: known-good repos only" disabled />
          </label>
          <label className="field">
            <span>Local repo path</span>
            <input
              value={localPath}
              placeholder="/absolute/path/to/repo"
              onChange={(event) => setLocalPath(event.target.value)}
            />
          </label>
          <button className="button button--wide" onClick={inspectLocalPath} disabled={localLoading}>
            <Search size={16} />
            {localLoading ? "Inspecting..." : "Inspect static path"}
          </button>
          {localStatus && <p className="local-status">{localStatus}</p>}
          <label className="field">
            <span>Demo fixture</span>
            <select
              value={fixture.meta.id}
              aria-label="Demo fixture"
              onChange={(event) => chooseFixture(event.target.value)}
            >
              {replayFixtures.map((option) => (
                <option value={option.meta.id} key={option.meta.id}>
                  {option.meta.name}
                </option>
              ))}
            </select>
          </label>
          <div className="fixture-note">
            {fixture.meta.expectedScoreBand && (
              <strong>
                Expected {fixture.meta.expectedScoreBand.min}-{fixture.meta.expectedScoreBand.max}
              </strong>
            )}
            <span>
              {fixture.events.length}{" "}
              {fixture.meta.mode === "local-static" ? "inspection events" : "replay events"}
            </span>
            {fixture.meta.requiredHarnessSplit && <em>Required harness split</em>}
          </div>
          <div className="fixture-role-card">
            <strong>
              {fixture.meta.mode === "local-static"
                ? "Static local inspection"
                : fixtureRoles[fixture.meta.id]?.role ?? "Replay fixture"}
            </strong>
            <p>
              {fixture.meta.mode === "local-static"
                ? "Read-only repo inspection. Ralph Ledger emits the same event stream without running commands."
                : fixtureRoles[fixture.meta.id]?.purpose ?? fixture.meta.summary}
            </p>
          </div>
          <label className="field">
            <span>Evaluation track</span>
            <select value={track} onChange={(event) => chooseTrack(event.target.value)}>
              {trackOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Panel preset</span>
            <select value={panelPreset} onChange={(event) => choosePanelPreset(event.target.value)}>
              {panelPresetOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <PanelPicker
            activePanel={panel}
            preset={panelPreset}
            valid={panelIsValid}
            onToggleJudge={toggleJudge}
          />
          <TrackFocusCard focus={focus} />

          <div className="button-row">
            <button
              className="button button--primary"
              onClick={running ? () => setRunning(false) : startReplay}
              disabled={!panelIsValid}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running
                ? "Pause"
                : state.completed
                  ? fixture.meta.mode === "local-static"
                    ? "Inspect again"
                    : "Replay again"
                  : hasStarted
                    ? "Resume"
                    : fixture.meta.mode === "local-static"
                      ? "Start inspection"
                      : "Start replay"}
            </button>
            <button className="button" onClick={resetReplay}>
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>

          <div className="mode-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              {fixture.meta.mode === "local-static"
                ? "Local Path Mode reads safe files and source layout only. It does not run install, build, test, or arbitrary repo commands."
                : "Scores are replayed from a saved event log. The same structured events drive the live feed, scorecard, evidence trail, split analysis, and report."}
            </p>
          </div>

          <div className="section-heading section-heading--spaced">
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Evaluator panel</span>
          </div>
          <p className="panel-disclaimer">
            Selected lenses affect the scorecard and report. Every evaluator now has authored
            score movements in replay fixtures and static local inspections.
          </p>
          <div className="judge-list">
            {panel.map((judgeId) => (
              <JudgeCard key={judgeId} judgeId={judgeId} compact />
            ))}
          </div>
          <EvaluatorBench activePanel={panel} />
        </aside>

        <section className="stage" aria-label="Live evaluation view">
          <div className="stage__hero">
            <div>
              <p className="eyebrow">Evaluating {fixture.meta.repoLabel}</p>
              <h2>Watch the score move as evidence arrives.</h2>
              <p className="stage__summary">{fixture.meta.summary}</p>
            </div>
            <div className="score-seal" aria-label={`Current score ${fmt(totalScore)} out of 100`}>
              <span>{fmt(totalScore)}</span>
              <small>/100</small>
            </div>
          </div>

          <div className="stage-strip" aria-label="Stage progress">
            {STAGES.map((stage, index) => {
              const isDone = state.completedStages.includes(stage.id);
              const isCurrent = state.currentStage === stage.id;
              return (
                <div
                  className={`stage-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                  key={stage.id}
                >
                  <span>{index + 1}</span>
                  <p>{stage.label}</p>
                </div>
              );
            })}
          </div>

          <div className="live-grid">
            <section className="event-panel" aria-label="Live event feed">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Live evaluation</p>
                  <h3>{STAGES[progress.currentIndex]?.label ?? "Ready"}</h3>
                </div>
                <span className="progress-label">{progress.percent}%</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress.percent}%` }} />
              </div>
              <RunningChecks events={state.visibleEvents} />
              <EventFeed events={state.visibleEvents} />
            </section>

            <section className="scorecard" aria-label="Scorecard view">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Scorecard</p>
                  <h3>Incremental consensus</h3>
                </div>
                <Gauge size={22} aria-hidden="true" />
              </div>

              <div className="criteria-list">
                {orderedRubric.map((item) => {
                  const criterion = state.criteria[item.id];
                  const score = getCriterionPanelScore(criterion, panel);
                  const confidence = getCriterionConfidence(criterion);
                  const agreement = getAgreementLevel(criterion, panel);
                  const spread = getPanelSpread(criterion, panel);
                  return (
                    <button
                      className={`criterion-row ${
                        selectedCriterion === item.id ? "is-selected" : ""
                      }`}
                      key={item.id}
                      onClick={() => {
                        setSelectedCriterion(item.id);
                        setActiveDeck("evidence");
                      }}
                    >
                      <span className="criterion-row__mark">{criterionIcon[item.id]}</span>
                      <span className="criterion-row__main">
                        <span className="criterion-row__title">{item.label}</span>
                        <span className="bar" aria-hidden="true">
                          <span style={{ width: `${(score / item.max) * 100}%` }} />
                        </span>
                      </span>
                      <span className="criterion-row__meta">
                        <strong>
                          {fmt(score)}/{item.max}
                        </strong>
                        <small>
                          {Math.round(confidence * 100)}% conf · {agreement} · spread{" "}
                          {fmt(spread.min)}-{fmt(spread.max)}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="judge-breakdown">
                {panel.map((judgeId) => (
                  <div className="judge-score" key={judgeId}>
                    <span style={{ background: JUDGES[judgeId].color }}>
                      {JUDGES[judgeId].marker}
                    </span>
                    <p>{JUDGES[judgeId].name}</p>
                    <strong>{fmt(getJudgeTotal(state, judgeId))}</strong>
                  </div>
                ))}
              </div>

              <ScoreMovementRail events={state.visibleEvents} />
            </section>
          </div>
        </section>
      </section>

      <section className="lower-grid" aria-label="Evidence, rubric, and report workspace">
        <nav className="deck-tabs" aria-label="Inspector tabs">
          <button
            className={activeDeck === "evidence" ? "is-active" : ""}
            onClick={() => setActiveDeck("evidence")}
          >
            <Search size={16} />
            Evidence inspector
          </button>
          <button
            className={activeDeck === "rubric" ? "is-active" : ""}
            onClick={() => setActiveDeck("rubric")}
          >
            <FileText size={16} />
            Rubric
          </button>
          <button
            className={activeDeck === "compare" ? "is-active" : ""}
            onClick={() => setActiveDeck("compare")}
          >
            <BarChart3 size={16} />
            Compare fixtures
          </button>
          <button
            className={activeDeck === "report" ? "is-active" : ""}
            onClick={() => setActiveDeck("report")}
          >
            <CheckCircle2 size={16} />
            Judge report
          </button>
        </nav>

        <div className="deck">
          {activeDeck === "evidence" && (
            <EvidenceInspector criterionId={selectedCriterion} stateCriterion={selected} />
          )}
          {activeDeck === "rubric" && <RubricView panel={panel} />}
          {activeDeck === "compare" && (
            <FixtureComparison
              activeFixtureId={fixture.meta.id}
              panel={panel}
              onChooseFixture={chooseFixture}
            />
          )}
          {activeDeck === "report" && (
            <ReportView
              markdown={report}
              reportJson={reportJson}
              fixtureId={fixture.meta.id}
              completed={state.completed}
            />
          )}
        </div>

        <PanelSplitsView state={state} panel={panel} />
      </section>
    </main>
  );
}

function ScoreMovementRail({ events }: { events: LedgerEvent[] }) {
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

function getJudgeTotal(
  state: ReturnType<typeof replayEvents>,
  judgeId: JudgeId,
) {
  return RUBRIC.reduce(
    (sum, item) => sum + getJudgeCriterionScore(state.criteria[item.id], judgeId),
    0,
  );
}

function JudgeCard({ judgeId, compact = false }: { judgeId: JudgeId; compact?: boolean }) {
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

function PanelPicker({
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

function TrackFocusCard({
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

function EvaluatorBench({ activePanel }: { activePanel: JudgeId[] }) {
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

function EventFeed({ events }: { events: LedgerEvent[] }) {
  const visible = events.slice(-13).reverse();
  if (visible.length === 0) {
    return (
      <div className="empty-feed">
        <Clock3 size={20} aria-hidden="true" />
        <p>Ready to replay the canonical Phase 0 event log.</p>
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

function RunningChecks({ events }: { events: LedgerEvent[] }) {
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

function EvidenceInspector({
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

function PanelSplitsView({
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

function FixtureComparison({
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

function RubricView({ panel }: { panel: JudgeId[] }) {
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

function ReportView({
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
