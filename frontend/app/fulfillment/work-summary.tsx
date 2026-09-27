import { workNextStep, customerWorkNextStep } from "./work-presentation";
import { ForecastRange } from "./forecast";
import type { Work } from "./model";
export function WorkSummary({
  work,
  staff = true,
}: {
  work: Work;
  staff?: boolean;
}) {
  return (
    <>
      <p>
        {work.mode === "account"
          ? staff
            ? "Play on the customer’s account"
            : "Play on your account"
          : "Play together"}{" "}
        · {work.alias}
      </p>
      <p>
        Status: {work.state.replaceAll("_", " ")} · Progress {work.progress}%
      </p>
      <progress
        className="work-progress"
        value={work.progress}
        max={100}
        aria-label="Reported fulfillment progress"
      />
      <p className="work-next-step">
        {staff ? workNextStep(work) : customerWorkNextStep(work)}
      </p>
      <p className="preserve-lines">{work.note}</p>
      {work.completion_pending && (
        <p>Completion submitted for administrator review.</p>
      )}
      {work.forecast && (
        <>
          <ForecastRange forecast={work.forecast} />
          {work.forecast_review && (
            <p role="status">
              Delivery forecast needs review: execution or assigned capacity
              changed. The previous range is retained for reference.
            </p>
          )}
        </>
      )}
      {!work.forecast && work.estimated_start && work.estimated_finish && (
        <p>
          Current delivery estimate:{" "}
          {new Date(work.estimated_start).toLocaleString()} –{" "}
          {new Date(work.estimated_finish).toLocaleString()}. This does not
          change the accepted agreement.
        </p>
      )}
      <details>
        <summary>Information shared with assigned staff</summary>
        <dl>
          {work.shared.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {Array.isArray(field.value)
                  ? field.value.join(", ")
                  : String(field.value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
