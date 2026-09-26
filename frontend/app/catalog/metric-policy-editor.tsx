import { Check, NumberInput } from "./controls";
import { useRef, useEffect } from "react";
import type { MetricPolicy } from "./discovery-model";

export default function MetricPolicyEditor({
  value,
  change,
}: {
  value: MetricPolicy | undefined;
  change: (value: MetricPolicy | undefined) => void;
}) {
  const retained = useRef(value);
  useEffect(() => {
    if (value) retained.current = value;
  }, [value]);
  return (
    <section aria-label="Public statistics policy">
      <h3>Public statistics</h3>
      <p>
        Count only verified paid orders. Small samples are hidden. Win rate
        remains unavailable until eligible match results exist. These settings
        never create a statistic.
      </p>
      <Check
        label="Allow source-based public statistics after publication"
        value={value != null}
        change={(enabled) => {
          change(
            enabled
              ? (retained.current ?? {
                  window_days: 30,
                  minimum_sample: 20,
                  maximum_age_seconds: 300,
                })
              : undefined,
          );
        }}
      />
      {value && (
        <fieldset>
          <legend>Review the reporting policy</legend>
          <p>
            Review these suggested settings before publishing. Reporting period:
            1–366 days; minimum sample: 5–1,000,000 records; maximum age:
            30–86,400 seconds.
          </p>
          <div className="catalog-grid">
            <NumberInput
              name="metrics.window_days"
              label="Reporting period (days)"
              value={value.window_days}
              change={(window_days) => {
                change({ ...value, window_days });
              }}
            />
            <NumberInput
              name="metrics.minimum_sample"
              label="Minimum eligible records"
              value={value.minimum_sample}
              change={(minimum_sample) => {
                change({ ...value, minimum_sample });
              }}
            />
            <NumberInput
              name="metrics.maximum_age_seconds"
              label="Maximum age (seconds)"
              value={value.maximum_age_seconds}
              change={(maximum_age_seconds) => {
                change({ ...value, maximum_age_seconds });
              }}
            />
          </div>
        </fieldset>
      )}
    </section>
  );
}
