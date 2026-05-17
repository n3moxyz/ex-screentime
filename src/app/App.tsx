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
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  PanelPicker,
  PanelSplitsView,
  ReportView,
  RubricView,
  RunningChecks,
  ScoreMovementRail,
  ScoreSummary,
  TrackFocusCard,
  getJudgeTotal,
} from "./components";

type ReplaySpeed = "normal" | "fast";
type DeckId = "evidence" | "rubric" | "compare" | "report";

const DECK_TAB_META: Array<{
  id: DeckId;
  label: string;
  icon: typeof Search;
}> = [
  { id: "evidence", label: "Evidence inspector", icon: Search },
  { id: "rubric", label: "Rubric", icon: FileText },
  { id: "compare", label: "Compare fixtures", icon: BarChart3 },
  { id: "report", label: "Judge report", icon: CheckCircle2 },
];
const DECK_IDS: DeckId[] = DECK_TAB_META.map((tab) => tab.id);
const deckTabId = (id: DeckId) => `deck-tab-${id}`;
const deckPanelId = (id: DeckId) => `deck-panel-${id}`;

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
  const [localFixture, setLocalFixture] = useState<ReplayFixture | null>(null);
  const [githubStatus, setGithubStatus] = useState<
    { kind: "info" | "success" | "error"; message: string } | null
  >(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubSuggestions, setGithubSuggestions] = useState<string[]>([]);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(getInitialReplaySpeed);
  const fixture = localFixture ?? (getFixtureById(selectedFixtureId) as ReplayFixture);
  const [selectedCriterion, setSelectedCriterion] =
    useState<CriterionId>("harness_agent_engineering");
  const [track, setTrack] = useState(replayFixtures[0].meta.track);
  const [panelPreset, setPanelPreset] = useState(replayFixtures[0].meta.track);
  const [panel, setPanel] = useState<JudgeId[]>(
    TRACK_PRESETS[replayFixtures[0].meta.track] ?? PHASE_ZERO_PANEL,
  );
  const [activeDeck, setActiveDeck] = useState<DeckId>("evidence");
  const tabRefs = useRef<Record<DeckId, HTMLButtonElement | null>>({
    evidence: null,
    rubric: null,
    compare: null,
    report: null,
  });
  const lowerGridRef = useRef<HTMLDivElement | null>(null);

  const openDeckAndScroll = (deck: DeckId) => {
    setActiveDeck(deck);
    requestAnimationFrame(() => {
      lowerGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
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
  const sessionMeta = useMemo(() => {
    const submittedRepoUrl =
      fixture.meta.submittedRepoUrl ?? (isGithubPreview ? submittedGithubUrl : undefined);
    return {
      ...fixture.meta,
      track,
      submittedRepoUrl,
    };
  }, [fixture.meta, isGithubPreview, submittedGithubUrl, track]);
  const report = useMemo(
    () => generateReportMarkdown(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const reportJson = useMemo(
    () => generateReportJson(state, sessionMeta, panel),
    [panel, sessionMeta, state],
  );
  const willCloneOnStart =
    !localFixture && submittedGithubUrl.length > 0 && fixture.meta.mode !== "local-static";
  const canStart = panelIsValid && !githubLoading;
  const modeLabel =
    fixture.meta.mode === "local-static"
      ? fixture.meta.submittedRepoUrl
        ? "GitHub Clone Mode"
        : "Static Local Path Mode"
      : willCloneOnStart
        ? "Ready to clone"
        : "Replay Fixture Mode";
  const startButtonLabel = running
    ? "Pause"
    : githubLoading
      ? "Cloning..."
      : state.completed
        ? "Run again"
        : hasStarted
          ? "Resume"
          : willCloneOnStart
            ? "Clone & inspect"
            : "Start evaluation";
  const heroEyebrow = willCloneOnStart
    ? "Submitted GitHub repo"
    : `Evaluating ${fixture.meta.repoLabel}`;
  const heroSummary = willCloneOnStart
    ? `Click ${"“"}Clone & inspect${"”"} to fetch ${submittedGithubUrl} with a depth-1 clone and run the same static pipeline as Local Path Mode. Ralph Ledger never executes the repo's code.`
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
    setSelectedFixtureId(nextFixture.meta.id);
    setTrack(nextTrack);
    setPanelPreset(nextTrack);
    setPanel(TRACK_PRESETS[nextTrack] ?? PHASE_ZERO_PANEL);
    setRunning(false);
    setCursor(0);
    setSelectedCriterion(getTrackFocus(nextTrack).leadCriteria[0]);
    setActiveDeck("evidence");
  };

  const runSafeReplayDemo = () => {
    const demoFixture = replayFixtures[0];
    const demoTrack = track;
    setLocalFixture(null);
    setSelectedFixtureId(demoFixture.meta.id);
    setGithubUrl("");
    setTrack(demoTrack);
    setPanelPreset(demoTrack);
    setPanel(TRACK_PRESETS[demoTrack] ?? PHASE_ZERO_PANEL);
    setSelectedCriterion(getTrackFocus(demoTrack).leadCriteria[0]);
    setActiveDeck("evidence");
    setCursor(0);
    setRunning(true);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/github-inspect");
        if (!response.ok) return;
        const payload = (await response.json()) as { suggestions?: string[] };
        if (!cancelled && Array.isArray(payload.suggestions)) {
          setGithubSuggestions(payload.suggestions);
        }
      } catch {
        /* suggestion list is informational; ignore fetch failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cloneGithubUrl = async (): Promise<ReplayFixture | null> => {
    const url = githubUrl.trim();
    if (!url) {
      setGithubStatus({
        kind: "error",
        message: "Paste a GitHub URL before running clone-and-inspect.",
      });
      return null;
    }
    setGithubLoading(true);
    setGithubStatus({
      kind: "info",
      message:
        "Cloning into a temp directory. Ralph Ledger only reads files; it does not execute the cloned repo.",
    });
    try {
      const response = await fetch("/api/github-inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "GitHub inspection failed.");
      }
      const nextFixture = payload as ReplayFixture;
      const selectedTrack = track;
      setLocalFixture(nextFixture);
      setTrack(selectedTrack);
      setPanelPreset(selectedTrack);
      setPanel(TRACK_PRESETS[selectedTrack] ?? TRACK_PRESETS["Harness / Skills Track"]);
      setSelectedCriterion(getTrackFocus(selectedTrack).leadCriteria[0]);
      setActiveDeck("evidence");
      setRunning(false);
      setCursor(0);
      setGithubStatus({
        kind: "success",
        message: "GitHub clone inspected statically. Watching the event stream now.",
      });
      return nextFixture;
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub inspection failed.";
      setGithubStatus({ kind: "error", message });
      return null;
    } finally {
      setGithubLoading(false);
    }
  };

  const startEvaluation = async () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (willCloneOnStart) {
      const cloned = await cloneGithubUrl();
      if (!cloned) return;
    }
    startReplay();
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

  const focusDeckTab = (id: DeckId) => {
    setActiveDeck(id);
    tabRefs.current[id]?.focus();
  };

  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = DECK_IDS.indexOf(activeDeck);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusDeckTab(DECK_IDS[(currentIndex + 1) % DECK_IDS.length]);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusDeckTab(DECK_IDS[(currentIndex - 1 + DECK_IDS.length) % DECK_IDS.length]);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusDeckTab(DECK_IDS[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusDeckTab(DECK_IDS[DECK_IDS.length - 1]);
    }
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
          {githubSuggestions.length > 0 && !submittedGithubUrl && !localFixture && (
            <div className="github-suggestion-row">
              <span className="github-suggestion-row__label">Try one of these:</span>
              <div className="github-suggestion-row__pills">
                {githubSuggestions.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="github-suggestion-pill"
                    onClick={() => updateGithubUrl(url)}
                  >
                    {url.replace(/^https:\/\/github\.com\//, "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="run-context-card">
            <strong>
              {fixture.meta.mode === "local-static"
                ? fixture.meta.submittedRepoUrl
                  ? "GitHub clone inspected"
                  : "Local static inspection ready"
                : willCloneOnStart
                  ? "Ready to clone & inspect"
                  : "Replay fixture loaded"}
            </strong>
            <p>
              {fixture.meta.mode === "local-static"
                ? fixture.meta.submittedRepoUrl
                  ? `Ralph Ledger read safe files from ${fixture.meta.repoLabel}. Press Start to watch the event stream.`
                  : "This fallback reads safe files only and emits the same structured evaluation stream."
                : willCloneOnStart
                  ? "Start will clone the repo with --depth 1, run the same static pipeline as Local Path Mode, then replay the captured events."
                  : "Paste a GitHub URL above to evaluate any public repo, or run the safe replay demo below for the curated baseline."}
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
              onClick={startEvaluation}
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
          {githubStatus && !running && (
            <div
              className={`clone-alert clone-alert--${githubStatus.kind}`}
              role={githubStatus.kind === "error" ? "alert" : "status"}
            >
              <p>{githubStatus.message}</p>
              {githubStatus.kind === "error" && (
                <button
                  type="button"
                  className="button clone-alert__action"
                  onClick={runSafeReplayDemo}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Run safe replay instead
                </button>
              )}
            </div>
          )}

          <button
            className="button button--ghost safe-replay-cta"
            onClick={runSafeReplayDemo}
            type="button"
            aria-label="Run safe replay demo of the strong harness fixture"
          >
            <Sparkles size={16} aria-hidden="true" />
            Run safe replay demo
          </button>
          <p className="safe-replay-hint">
            Bypasses URL and local inspection. Replays the strongest deterministic fixture so the
            cockpit is always one click from a working demo.
          </p>

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
                ? fixture.meta.submittedRepoUrl
                  ? "GitHub Clone Mode statically inspected a cloned working tree. Ralph Ledger reads files only and never executes repo commands."
                  : "Local Path Mode reads safe files and source layout only. It does not run install, build, test, or arbitrary repo commands."
                : "Paste any public GitHub URL above to evaluate it. Ralph Ledger clones with --depth 1, reads files, and deletes the temp directory. It never executes the repo's code."}
            </p>
          </div>

          <div className="section-heading section-heading--spaced">
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Evaluator panel</span>
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

          <ol className="stage-strip" aria-label="Stage progress">
            {STAGES.map((stage, index) => {
              const isDone = state.completedStages.includes(stage.id);
              const isCurrent = state.currentStage === stage.id;
              const statusLabel = isDone ? "completed" : isCurrent ? "in progress" : "pending";
              return (
                <li
                  className={`stage-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                  key={stage.id}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Stage ${index + 1} of ${STAGES.length}: ${stage.label} — ${statusLabel}`}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  <p>{stage.label}</p>
                </li>
              );
            })}
          </ol>

          {state.completed && (
            <ScoreSummary
              state={state}
              panel={panel}
              track={track}
              onOpenDeck={openDeckAndScroll}
              onSelectCriterion={setSelectedCriterion}
            />
          )}

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
                      <span className="criterion-row__mark" aria-hidden="true">
                        {criterionIcon[item.id]}
                      </span>
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

      <section
        className="lower-grid"
        aria-label="Evidence, rubric, and report workspace"
        ref={lowerGridRef}
      >
        <div
          className="deck-tabs"
          role="tablist"
          aria-label="Inspector views"
          aria-orientation="horizontal"
          onKeyDown={handleTabKey}
        >
          {DECK_TAB_META.map((tab) => {
            const isActive = activeDeck === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                id={deckTabId(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={deckPanelId(tab.id)}
                tabIndex={isActive ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                onClick={() => setActiveDeck(tab.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          className="deck"
          role="tabpanel"
          id={deckPanelId(activeDeck)}
          aria-labelledby={deckTabId(activeDeck)}
          tabIndex={0}
        >
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
