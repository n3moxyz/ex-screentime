import { Clock3, Download } from "lucide-react";
import { JUDGES } from "../../evaluator/judges";
import { RUBRIC } from "../../evaluator/rubric";
import type { JudgeId } from "../../evaluator/types";
import { JudgeCard } from "./panel";

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
        <>
          <p className="report-preview-note">
            Raw markdown preview. Use the buttons above to download a formatted file.
          </p>
          <pre>{markdown}</pre>
        </>
      ) : (
        <div className="report-pending">
          <Clock3 size={22} />
          <p>Report generation is waiting for the replay evaluation to complete.</p>
        </div>
      )}
    </section>
  );
}
