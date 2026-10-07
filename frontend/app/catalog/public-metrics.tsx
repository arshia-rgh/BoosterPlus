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
function reportingPeriod(start: string, end: string) {
  const from = new Date(start);
  const until = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime()))
    return "Reporting period unavailable";
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    dateStyle: "short",
  });
  return `${format.format(from)} – ${format.format(until)} UTC`;
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
              <small
                title={
                  available && metric.period_start
                    ? `${publicTime(metric.period_start)} to ${publicTime(metric.period_end)} (end exclusive)`
                    : undefined
                }
              >
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
                            ? reportingPeriod(
                                metric.period_start,
                                metric.period_end,
                              )
                            : "At the last update"
                          : "Not available yet"}
              </small>
            </div>
          );
        })}
      </div>
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
