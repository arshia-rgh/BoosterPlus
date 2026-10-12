import { useEffect, useRef, useState } from "react";
import { post, APIError } from "../identity/api";
import { Action, ErrorNotice } from "./controls";
import { minorDisplay } from "./dynamic-form";
import {
  estimateSchema,
  type Configuration,
  type Estimate,
  type PriceCase,
  type Service,
  type Issue,
} from "./model";

export interface PricingPreviewContext {
  gameID: string;
  revision: number;
}

export default function PricingPreview({
  context,
  config,
  service,
  example,
  path,
  onIssues,
}: {
  context: PricingPreviewContext;
  config: Configuration;
  service: Service;
  example: PriceCase;
  path?: string;
  onIssues?: ((issues: Issue[]) => void) | undefined;
}) {
  const fingerprint = JSON.stringify([context, config, service.key, example]);
  const [receipt, setReceipt] = useState<{
    fingerprint: string;
    result?: Estimate;
    error?: unknown;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const current = receipt?.fingerprint === fingerprint ? receipt : null;
  const result = current?.result;
  useEffect(() => {
    if (!current || !onIssues) return;
    if (current.error instanceof APIError) onIssues(current.error.issues);
    else if (current.result)
      onIssues(
        current.result.issues.map((issue) => ({
          ...issue,
          path: path ? `${path}.answers.${issue.path}` : issue.path,
        })),
      );
  }, [current, onIssues, path]);
  const matched =
    result?.outcome === example.outcome &&
    (result.outcome !== "estimated" ||
      result.amount_minor === example.amount_minor);
  async function calculate() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setReceipt(null);
    onIssues?.([]);
    try {
      const result = await post(
        `/admin/catalog/games/${encodeURIComponent(context.gameID)}/estimate-preview`,
        {
          release_id: String(context.revision),
          service: service.key,
          answers: example.answers,
          configuration: config,
        },
        estimateSchema,
      );
      setReceipt({ fingerprint, result });
    } catch (error) {
      setReceipt({ fingerprint, error });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section aria-label={`Price check for ${example.key}`}>
      <p className="quiet">
        Check these unsaved rules without saving or publishing. Your expected
        result is kept separately.
      </p>
      <Action
        disabled={busy}
        onClick={() => {
          void calculate();
        }}
      >
        {busy ? "Calculating…" : "Check this price example"}
      </Action>
      <div aria-live="polite">
        {receipt && !current && (
          <p>
            The form or pricing changed. Check this example again for a current
            result.
          </p>
        )}
        {current?.error != null && (
          <>
            <ErrorNotice error={current.error} />
            {current.error instanceof APIError &&
              current.error.issues.length > 0 && (
                <p>
                  Correct the configuration issues before checking this example.
                  The draft has not been saved or published.
                </p>
              )}
          </>
        )}
        {result && (
          <>
            {result.outcome === "invalid" ? (
              <>
                <p>Review the example’s selections:</p>
                <ul>
                  {result.issues.map((issue, i) => (
                    <li key={i}>
                      {service.fields.find((field) => field.key === issue.path)
                        ?.label ?? "Example"}
                      : {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p>
                  <strong>
                    Actual result:{" "}
                    {result.outcome === "estimated"
                      ? `${result.currency} ${minorDisplay(result.amount_minor)}`
                      : "Manual review"}
                  </strong>
                </p>
                <p>
                  {matched
                    ? "Matches your expected result."
                    : "Does not match your expected result. Review the rules or your independently calculated expectation."}
                </p>
                {result.lines.length > 0 && (
                  <ul>
                    {result.lines.map((line) => (
                      <li key={line.key}>
                        {line.label}: {result.currency}{" "}
                        {minorDisplay(line.amount_minor)}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
