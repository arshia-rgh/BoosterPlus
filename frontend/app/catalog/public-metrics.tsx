import { useEffect, useState } from "react";
import type { PublicMetric } from "./public-discovery";
import "./public-discovery.css";

export function useEvidenceClock(expires: readonly string[]) {
  const [now, setNow] = useState(0);
  const signature = expires.join("|");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const instant = Date.now();
      setNow(instant);
      clearTimeout(timer);
      const next = signature
        .split("|")
        .map(Date.parse)
        .filter((at) => at > instant)
        .sort((a, b) => a - b)[0];
      if (next != null)
        timer = setTimeout(update, Math.min(next - instant + 10, 2147483647));
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [signature]);
  return now;
}
export function publicTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC";
}
export default function PublicMetrics({
  metrics,
  loading = false,
  failed = false,
  retry,
}: {
  metrics: PublicMetric[];
  loading?: boolean;
  failed?: boolean;
  retry?: () => void;
}) {
  const now = useEvidenceClock(
    metrics.flatMap((metric) => (metric.stale_at ? [metric.stale_at] : [])),
  );
  const values = metrics.length
    ? metrics
    : ["Active orders", "Completed orders", "Win rate"].map(
        (label): PublicMetric => ({
          key: label,
          label,
          definition:
            "Statistics appear only when sufficient verified evidence and a published reporting policy are available.",
          state: "unavailable",
          period_end: "",
          refreshed_at: "",
        }),
      );
  return (
    <section
      className="public-metrics"
      aria-label="Activity statistics"
      aria-busy={loading}
    >
      <div className="public-metric-grid">
        {values.map((metric) => {
          const stale =
            metric.state === "stale" ||
            (!!metric.stale_at && Date.parse(metric.stale_at) <= now);
          const available =
            !failed &&
            !stale &&
            metric.state === "available" &&
            metric.value != null;
          return (
            <div className="public-metric" key={metric.key}>
              <span>{metric.label}</span>
              <strong>
                {available ? metric.value?.toLocaleString("en-US") : "—"}
              </strong>
              <small>
                {loading
                  ? "Loading activity…"
                  : failed
                    ? "Temporarily unavailable"
                    : stale
                      ? "Update needed"
                      : metric.state === "insufficient_sample"
                        ? "Not enough eligible records"
                        : available
                          ? metric.period_start
                            ? "During the stated period"
                            : "At the last update"
                          : "Not available yet"}
              </small>
            </div>
          );
        })}
      </div>
      <details className="metric-method">
        <summary>How these statistics are measured</summary>
        {values.map((metric) => (
          <div key={metric.key}>
            <h2>{metric.label}</h2>
            <p>{metric.definition}</p>
            {metric.period_start && (
              <p>
                Period: {publicTime(metric.period_start)} to{" "}
                {publicTime(metric.period_end)} (end exclusive).
              </p>
            )}
            {metric.refreshed_at && (
              <p>
                Updated: {publicTime(metric.refreshed_at)}
                {metric.sample_size != null && metric.state === "available"
                  ? ` · ${String(metric.sample_size)} eligible records`
                  : ""}
                .
              </p>
            )}
          </div>
        ))}
        <p>
          Past activity is not a guarantee of a future result. Unavailable
          values are never shown as zero.
        </p>
      </details>
      {retry &&
        (failed ||
          metrics.some(
            (metric) => metric.stale_at && Date.parse(metric.stale_at) <= now,
          )) && (
          <button
            type="button"
            className="button compact"
            onClick={retry}
            disabled={loading}
          >
            {loading ? "Updating…" : "Refresh activity"}
          </button>
        )}
    </section>
  );
}
