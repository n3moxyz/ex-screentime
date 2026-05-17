import {
  BarChart3,
  CheckCircle2,
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { JUDGES, PHASE_ZERO_PANEL, TRACK_PRESETS } from "../evaluator/judges";
import { generateReportJson, generateReportMarkdown } from "../evaluator/report";
import { RUBRIC, RUBRIC_BY_ID, STAGES } from "../evaluator/rubric";
import {
  getAgreementLevel,
  getCriterionConfidence,
  getCriterionPanelScore,
  getPanelSpread,
  getStageProgress,
  getTotalScore,
  replayEvents,
} from "../evaluator/reducer";
import type { CriterionId, JudgeId, ReplayFixture } from "../evaluator/types";
import { getFixtureById, replayFixtures } from "../fixtures/fixtures";
import {
  EvaluatorBench,
  EventFeed,
  EvidenceInspector,
  FixtureComparison,
  JudgeCard,
  PanelPicker,
  PanelSplitsView,
  ReportView,
  RubricView,
  RunningChecks,
  ScoreMovementRail,
  TrackFocusCard,
  getJudgeTotal,
} from "./components";

type ReplaySpeed = "normal" | "fast";

const getInitialReplaySpeed = (): ReplaySpeed => {
  if (typeof window === "undefined") return "normal";
  return new URLSearchParams(window.location.search).get("speed") === "fast" ? "fast" : "normal";
};

const fmt = (value: number, digits = 1) => value.toFixed(digits);

const criterionIcon: Record<CriterionId, string> = {
  impact: "IM",
  technical_execution: "TE",
  originality: "OR",
  demo_quality: "DQ",
  harness_agent_engineering: "HA",
};

const trackOptions: Array<{ value: string; label: string }> = [
  { value: "Harness / Skills Track", label: "Harness" },
  { value: "Impact Track", label: "Impact" },
  { value: "Overall Ralphthon", label: "Overall Ralphthon" },
];

const panelPresetOptions = [
  "Harness / Skills Track",
  "Impact Track",
  "Overall Ralphthon",
  "Phase 0 Split Demo",
  "Custom",
];

const panelPresetLabels: Record<string, string> = {
  "Harness / Skills Track": "Harness panel",
  "Impact Track": "Impact panel",
  "Overall Ralphthon": "Overall panel",
  "Phase 0 Split Demo": "Phase 0 split",
  Custom: "Custom panel",
};

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
};

const getTrackFocus = (track: string) => trackGuidance[track] ?? trackGuidance["Harness / Skills Track"];

export function App() {
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState(replayFixtures[0].meta.id);
  const [githubUrl, setGithubUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [localFixture, setLocalFixture] = useState<ReplayFixture | null>(null);
  const [localStatus, setLocalStatus] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(getInitialReplaySpeed);
  const fixture = localFixture ?? (getFixtureById(selectedFixtureId) as ReplayFixture);
  const [selectedCriterion, setSelectedCriterion] =
    useState<CriterionId>("harness_agent_engineering");
  const [track, setTrack] = useState(replayFixtures[0].meta.track);
  const [panelPreset, setPanelPreset] = useState(replayFixtures[0].meta.track);
  const [panel, setPanel] = useState<JudgeId[]>(
    TRACK_PRESETS[replayFixtures[0].meta.track] ?? PHASE_ZERO_PANEL,
  );
  const [activeDeck, setActiveDeck] = useState<"evidence" | "rubric" | "compare" | "report">(
    "evidence",
  );
  const replayDelayMs = replaySpeed === "fast" ? 35 : 620;
  const focus = getTrackFocus(track);

  const state = useMemo(() => replayEvents(fixture.events, cursor), [cursor, fixture.events]);
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
  const hasStarted = cursor > 0;
  const panelIsValid =
    panelPreset !== "Custom" || (panel.length >= 3 && panel.length <= 5);
  const submittedGithubUrl = githubUrl.trim();
  const isGithubPreview = fixture.meta.mode !== "local-static" && submittedGithubUrl.length > 0;
  const sessionMeta = useMemo(
    () => ({
      ...fixture.meta,
      track,
      submittedRepoUrl: isGithubPreview ? submittedGithubUrl : undefined,
    }),
    [fixture.meta, isGithubPreview, submittedGithubUrl, track],
  );
  const report = useMemo(
    () => generateReportMarkdown(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const reportJson = useMemo(
    () => generateReportJson(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const canStart =
    panelIsValid && (fixture.meta.mode === "local-static" || submittedGithubUrl.length > 0);
  const modeLabel =
    fixture.meta.mode === "local-static"
      ? "Static Local Path Mode"
      : isGithubPreview
        ? "GitHub URL Preview"
        : "Replay Fixture Mode";
  const startButtonLabel = running
    ? "Pause"
    : !canStart
      ? "Paste URL first"
      : state.completed
        ? "Run again"
        : hasStarted
          ? "Resume"
          : "Start evaluation";
  const heroEyebrow = isGithubPreview
    ? "Submitted GitHub repo"
    : `Evaluating ${fixture.meta.repoLabel}`;
  const heroSummary = isGithubPreview
    ? `${submittedGithubUrl} is queued for the judge cockpit. Live GitHub fetching is still Phase 2, so this build runs the strongest safe replay baseline while preserving the selected track and panel.`
    : fixture.meta.summary;
  const toggleReplaySpeed = () => {
    setReplaySpeed((current) => (current === "fast" ? "normal" : "fast"));
  };

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
    const nextTrack = nextFixture.meta.track;
    setLocalFixture(null);
    setLocalStatus("");
    setSelectedFixtureId(nextFixture.meta.id);
    setTrack(nextTrack);
    setPanelPreset(nextTrack);
    setPanel(TRACK_PRESETS[nextTrack] ?? PHASE_ZERO_PANEL);
    setRunning(false);
    setCursor(0);
    setSelectedCriterion(getTrackFocus(nextTrack).leadCriteria[0]);
    setActiveDeck("evidence");
  };

  const updateGithubUrl = (nextUrl: string) => {
    setGithubUrl(nextUrl);
    if (localFixture) {
      chooseFixture(replayFixtures[0].meta.id);
      return;
    }
    setRunning(false);
    setCursor(0);
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
      setGithubUrl("");
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
          <span className="pill pill--replay">{modeLabel}</span>
          <button
            className={`pill speed-toggle ${replaySpeed === "fast" ? "is-fast" : ""}`}
            type="button"
            aria-pressed={replaySpeed === "fast"}
            onClick={toggleReplaySpeed}
          >
            <Clock3 size={14} aria-hidden="true" />
            {replaySpeed === "fast" ? "Fast replay" : "Normal replay"}
          </button>
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
            <input
              value={githubUrl}
              placeholder="https://github.com/org/repo"
              onChange={(event) => updateGithubUrl(event.target.value)}
            />
          </label>

          <div className="run-context-card">
            <strong>
              {fixture.meta.mode === "local-static"
                ? "Local static inspection ready"
                : submittedGithubUrl
                  ? "Ready for track and panel"
                  : "Paste a GitHub URL to begin"}
            </strong>
            <p>
              {fixture.meta.mode === "local-static"
                ? "This fallback reads safe files only and emits the same structured evaluation stream."
                : submittedGithubUrl
                  ? "The strongest replay baseline stays hidden as the reliable demo engine until live GitHub cloning lands."
                  : "Then choose Harness, Impact, or Overall Ralphthon and start the evaluation."}
            </p>
          </div>

          <label className="field">
            <span>Evaluation track</span>
            <select value={track} onChange={(event) => chooseTrack(event.target.value)}>
              {trackOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TrackFocusCard focus={focus} />

          <div className="button-row">
            <button
              className="button button--primary"
              onClick={running ? () => setRunning(false) : startReplay}
              disabled={!canStart}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {startButtonLabel}
            </button>
            <button className="button" onClick={resetReplay}>
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>

          <details className="fallback-panel panel-advanced">
            <summary>
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span>Panel details</span>
            </summary>
            <p>
              The track picks the judging panel automatically. Override this only for calibration
              or custom lens testing.
            </p>
            <label className="field">
              <span>Panel override</span>
              <select
                value={panelPreset}
                onChange={(event) => choosePanelPreset(event.target.value)}
              >
                {panelPresetOptions.map((option) => (
                  <option value={option} key={option}>
                    {panelPresetLabels[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
            <PanelPicker
              activePanel={panel}
              preset={panelPreset}
              valid={panelIsValid}
              onToggleJudge={toggleJudge}
            />
          </details>

          <div className="mode-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              {fixture.meta.mode === "local-static"
                ? "Local Path Mode reads safe files and source layout only. It does not run install, build, test, or arbitrary repo commands."
                : "GitHub URL Mode is not fetching remote code yet. The saved strong replay is the default safe baseline; calibration fixtures live in Compare."}
            </p>
          </div>

          <details className="fallback-panel">
            <summary>
              <Search size={16} aria-hidden="true" />
              <span>Local static fallback</span>
            </summary>
            <p>
              Use this for a repo already on disk. Ralph Ledger reads safe files only and never runs
              project commands.
            </p>
            <label className="field">
              <span>Local repo path</span>
              <input
                value={localPath}
                placeholder="/absolute/path/to/repo"
                onChange={(event) => setLocalPath(event.target.value)}
              />
            </label>
            <button
              className="button button--wide"
              onClick={inspectLocalPath}
              disabled={localLoading}
            >
              <Search size={16} />
              {localLoading ? "Inspecting..." : "Inspect static path"}
            </button>
            {localStatus && <p className="local-status">{localStatus}</p>}
          </details>

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
              <p className="eyebrow">{heroEyebrow}</p>
              <h2>Watch the score move as evidence arrives.</h2>
              <p className="stage__summary">{heroSummary}</p>
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
