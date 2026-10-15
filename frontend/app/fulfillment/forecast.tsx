import { ActionFields, requireText } from "../ui/action-fields";
import { useState } from "react";
import { z } from "../validation";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import {
  forecastPreviewSchema,
  workSchema,
  type Forecast,
  type Work,
} from "./model";

export function ForecastRange({ forecast }: { forecast: Forecast }) {
  const date = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      timeZone: forecast.zone,
      timeZoneName: "short",
    });
  return (
    <div>
      <p>
        Estimated start window: {date(forecast.start_earliest)} –{" "}
        {date(forecast.start_latest)}
      </p>
      <p>
        Estimated finish window: {date(forecast.finish_earliest)} –{" "}
        {date(forecast.finish_latest)}
      </p>
      <p>
        Operating zone: {forecast.zone}. Calculated{" "}
        {new Date(forecast.calculated_at).toLocaleString()} using rule{" "}
        {forecast.rule}. Continued availability and required game access are
        necessary. Accepted delivery terms remain unchanged.
      </p>
    </div>
  );
}
export default function ForecastControls({
  work,
  reload,
}: {
  work: Work;
  reload: () => void;
}) {
  const [preview, setPreview] = useState<z.infer<
      typeof forecastPreviewSchema
    > | null>(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function calculate() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(
        await post(
          `/admin/fulfillment/${work.order_id}/forecast/preview`,
          {},
          forecastPreviewSchema,
        ),
      );
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!preview?.forecast) return;
    setBusy(true);
    setError(null);
    try {
      requireText("note", note);
      await post(
        `/admin/fulfillment/${work.order_id}/forecast/apply`,
        {
          version: work.version,
          order_version: work.order_version,
          basis: preview.basis,
          calculated_at: preview.forecast.calculated_at,
          note,
        },
        workSchema,
      );
      setPreview(null);
      setNote("");
      reload();
    } catch (cause) {
      setError(cause);
      if (!(cause instanceof APIError) || !cause.issues.length)
        setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ActionFields error={error} busy={busy}>
      <section className="catalog-section">
        <h3>Calculate delivery range</h3>
        <p>
          Review a range from the purchased rules, current assigned queue and
          confirmed sessions. Apply within ten minutes. If confirmation is
          needed, verify here with an authenticator or email code. Changes
          require a fresh preview.
        </p>
        <ErrorNotice error={error} />
        <Action
          disabled={busy}
          onClick={() => {
            void calculate();
          }}
        >
          Calculate delivery forecast
        </Action>
        {preview && (
          <div role="status">
            <p>
              {preview.status === "needs_review"
                ? "Needs review. "
                : "Ready for review. "}
              {preview.reason}
            </p>
            {preview.forecast && (
              <>
                <ForecastRange forecast={preview.forecast} />
                <Text
                  name="note"
                  label="Delivery estimate reason"
                  value={note}
                  change={setNote}
                  multiline
                />
                <Action
                  disabled={busy}
                  onClick={() => {
                    void apply();
                  }}
                >
                  Apply delivery forecast
                </Action>
              </>
            )}
          </div>
        )}
      </section>
    </ActionFields>
  );
}
