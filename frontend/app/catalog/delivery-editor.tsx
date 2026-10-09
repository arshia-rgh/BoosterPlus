import {
  Action,
  Check,
  ConditionEditor,
  NumberInput,
  Ordering,
  Select,
  Text,
  move,
  nextKey,
} from "./controls";
import type { DeliveryRule, Service } from "./model";

export default function DeliveryEditor({
  path = "",
  service,
  change,
}: {
  path?: string;
  service: Service;
  change: (patch: Partial<Service>) => void;
}) {
  const policy = service.delivery;
  const updateRule = (index: number, patch: Partial<DeliveryRule>) => {
    if (policy)
      change({
        delivery: {
          ...policy,
          rules: policy.rules.map((rule, i) =>
            i === index ? { ...rule, ...patch } : rule,
          ),
        },
      });
  };
  return (
    <section className="catalog-section">
      <h3>Operational delivery rules</h3>
      <p>
        These rules forecast queued work after staff assignment. They do not
        change purchased delivery terms. All durations are real working minutes.
        The first matching rule for the delivery mode wins; unmatched work
        requires review.
      </p>
      <Check
        name={path}
        label="Configure delivery forecasts"
        value={!!policy}
        change={(enabled) => {
          change({
            delivery: enabled
              ? { calendar: { zone: "", windows: [], closures: [] }, rules: [] }
              : undefined,
          });
        }}
      />
      {policy && (
        <>
          <Text
            name={`${path}.calendar.zone`}
            label="Operating time zone"
            value={policy.calendar.zone}
            help="Declare an IANA zone such as Asia/Tehran. Repeated openings use the first occurrence and closings the second. Skipped clock boundaries require review."
            change={(zone) => {
              change({
                delivery: { ...policy, calendar: { ...policy.calendar, zone } },
              });
            }}
          />
          {policy.calendar.windows.map((window, index) => (
            <fieldset key={index} className="catalog-item">
              <legend>Operating window {index + 1}</legend>
              <Select
                name={`${path}.calendar.windows.${String(index)}.weekday`}
                label="Weekday"
                value={String(window.weekday)}
                options={[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day, i) => [String(i), day])}
                change={(value) => {
                  change({
                    delivery: {
                      ...policy,
                      calendar: {
                        ...policy.calendar,
                        windows: policy.calendar.windows.map((w, i) =>
                          i === index ? { ...w, weekday: Number(value) } : w,
                        ),
                      },
                    },
                  });
                }}
              />
              {(["start", "end"] as const).map((boundary) => (
                <Text
                  key={boundary}
                  name={`${path}.calendar.windows.${String(index)}.${boundary}`}
                  label={
                    boundary === "start"
                      ? "Opens (HH:mm)"
                      : "Closes (HH:mm; 24:00 allowed)"
                  }
                  value={boundary === "start" ? window.start : window.end}
                  change={(value) => {
                    change({
                      delivery: {
                        ...policy,
                        calendar: {
                          ...policy.calendar,
                          windows: policy.calendar.windows.map((w, i) =>
                            i === index ? { ...w, [boundary]: value } : w,
                          ),
                        },
                      },
                    });
                  }}
                />
              ))}
              <Action
                onClick={() => {
                  change({
                    delivery: {
                      ...policy,
                      calendar: {
                        ...policy.calendar,
                        windows: policy.calendar.windows.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    },
                  });
                }}
              >
                Remove operating window
              </Action>
            </fieldset>
          ))}
          <Action
            disabled={policy.calendar.windows.length >= 28}
            onClick={() => {
              change({
                delivery: {
                  ...policy,
                  calendar: {
                    ...policy.calendar,
                    windows: [
                      ...policy.calendar.windows,
                      { weekday: 1, start: "", end: "" },
                    ],
                  },
                },
              });
            }}
          >
            Add operating window
          </Action>
          <p>
            Closure dates use the operating zone. Split overnight windows at
            midnight.
          </p>
          {policy.calendar.closures.map((date, index) => (
            <div key={index}>
              <Text
                label={`Closure date ${String(index + 1)}`}
                type="date"
                name={`${path}.calendar.closures.${String(index)}`}
                value={date}
                change={(value) => {
                  change({
                    delivery: {
                      ...policy,
                      calendar: {
                        ...policy.calendar,
                        closures: policy.calendar.closures.map((d, i) =>
                          i === index ? value : d,
                        ),
                      },
                    },
                  });
                }}
              />
              <Action
                onClick={() => {
                  change({
                    delivery: {
                      ...policy,
                      calendar: {
                        ...policy.calendar,
                        closures: policy.calendar.closures.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    },
                  });
                }}
              >
                Remove closure date
              </Action>
            </div>
          ))}
          <Action
            disabled={policy.calendar.closures.length >= 180}
            onClick={() => {
              change({
                delivery: {
                  ...policy,
                  calendar: {
                    ...policy.calendar,
                    closures: [...policy.calendar.closures, ""],
                  },
                },
              });
            }}
          >
            Add closure date
          </Action>
          <p>
            Queue delay is consumed in the operating calendar. Play-on-account
            work uses that calendar; play-together work consumes only confirmed
            sessions. Each other active paid assignment adds the declared queue
            adjustment. Forecasts stop at 90 days and never infer remaining
            effort from progress percentages.
          </p>
          {policy.rules.map((rule, index) => (
            <fieldset className="catalog-item" key={index}>
              <legend>Delivery rule {index + 1}</legend>
              <Text
                label="Delivery rule key"
                name={`${path}.rules.${String(index)}.key`}
                value={rule.key}
                change={(key) => {
                  updateRule(index, { key });
                }}
              />
              <Select
                label="Forecast mode"
                name={`${path}.rules.${String(index)}.mode`}
                value={rule.mode}
                options={[
                  ["account", "Play on account"],
                  ["together", "Play together"],
                ]}
                change={(mode) => {
                  updateRule(index, {
                    mode: mode === "account" ? "account" : "together",
                  });
                }}
              />
              {(
                [
                  ["min_minutes", "Minimum work minutes", rule.min_minutes],
                  ["max_minutes", "Maximum work minutes", rule.max_minutes],
                  [
                    "wait_min_minutes",
                    "Minimum queue minutes",
                    rule.wait_min_minutes,
                  ],
                  [
                    "wait_max_minutes",
                    "Maximum queue minutes",
                    rule.wait_max_minutes,
                  ],
                  [
                    "workload_minutes",
                    "Queue minutes per other paid assignment",
                    rule.workload_minutes,
                  ],
                ] as const
              ).map(([key, label, value]) => (
                <NumberInput
                  key={key}
                  label={label}
                  name={`${path}.rules.${String(index)}.${key}`}
                  value={value}
                  change={(value) => {
                    updateRule(index, { [key]: value });
                  }}
                />
              ))}
              <ConditionEditor
                label="Delivery condition"
                fields={service.fields.filter(
                  (f) => f.stage !== "fulfillment" && f.type !== "attachment",
                )}
                path={`${path}.rules.${String(index)}.when`}
                value={rule.when}
                change={(when) => {
                  updateRule(index, { when });
                }}
              />
              <Ordering
                index={index}
                count={policy.rules.length}
                change={(direction) => {
                  change({
                    delivery: {
                      ...policy,
                      rules: move(policy.rules, index, direction),
                    },
                  });
                }}
                remove={() => {
                  change({
                    delivery: {
                      ...policy,
                      rules: policy.rules.filter((_, i) => i !== index),
                    },
                  });
                }}
              />
            </fieldset>
          ))}
          <Action
            disabled={policy.rules.length >= 40}
            onClick={() => {
              change({
                delivery: {
                  ...policy,
                  rules: [
                    ...policy.rules,
                    {
                      key: nextKey("delivery", policy.rules),
                      mode:
                        service.fulfillment?.mode === "account"
                          ? "account"
                          : "together",
                      min_minutes: 0,
                      max_minutes: 0,
                      wait_min_minutes: 0,
                      wait_max_minutes: 0,
                      workload_minutes: 0,
                    },
                  ],
                },
              });
            }}
          >
            Add delivery rule
          </Action>
        </>
      )}
    </section>
  );
}
