import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { LedgerEvent } from "../../evaluator/types";

export function EventFeed({ events }: { events: LedgerEvent[] }) {
  const visible = events.slice(-13).reverse();
  if (visible.length === 0) {
    return (
      <div className="empty-feed">
        <Clock3 size={20} aria-hidden="true" />
        <p>Ready to run the evaluation stream.</p>
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

export function RunningChecks({ events }: { events: LedgerEvent[] }) {
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
