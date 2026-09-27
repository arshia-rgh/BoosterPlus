import { useRef, useState } from "react";
import { z } from "../validation";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { uncertain } from "../support/chat-state";
import { windowSchema, type LocalTime } from "./calendar-model";
import TimeInput from "./time-input";
type Entry = { start: LocalTime; end: LocalTime };
const resultSchema = z.object({ windows: z.array(windowSchema) });
// Work in calendar dates, not the browser's timezone. The server resolves each
// reviewed local instant and rejects nonexistent or ambiguous DST hours.
export function weeklyDates(first: Entry, count: number): Entry[] {
  const shift = (value: LocalTime, days: number): LocalTime => {
    const date = new Date(value.local + ":00Z");
    if (!Number.isFinite(date.getTime()))
      throw new Error("Choose valid start and end dates.");
    date.setUTCDate(date.getUTCDate() + days);
    return {
      ...value,
      local: date.toISOString().slice(0, 16),
      occurrence: days ? "" : value.occurrence,
    };
  };
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw new Error("Choose between 1 and 12 weekly dates.");
  return Array.from({ length: count }, (_, i) => ({
    start: shift(first.start, i * 7),
    end: shift(first.end, i * 7),
  }));
}
export default function AvailabilityEditor({
  base,
  zone,
  reload,
}: {
  base: string;
  zone: string;
  reload: () => void;
}) {
  const [start, setStart] = useState<LocalTime>({
      local: "",
      zone,
      occurrence: "",
    }),
    [end, setEnd] = useState<LocalTime>({ local: "", zone, occurrence: "" }),
    [weekly, setWeekly] = useState(false),
    [count, setCount] = useState("4"),
    [entries, setEntries] = useState<Entry[] | null>(null),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(""),
    lock = useRef(false);
  function review() {
    setError(null);
    setSuccess("");
    try {
      setEntries(weeklyDates({ start, end }, weekly ? Number(count) : 1));
      setKey(crypto.randomUUID());
    } catch (cause) {
      setError(cause);
    }
  }
  function change(index: number, entry: Entry) {
    setEntries(
      (current) =>
        current?.map((value, i) => (i === index ? entry : value)) ?? null,
    );
    setKey(crypto.randomUUID());
  }
  async function publish() {
    if (lock.current || !entries?.length) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      const result = await post(
        base + "/window-series",
        {
          request_key: key,
          windows: entries.map((entry) => ({ ...entry, request_key: "" })),
        },
        resultSchema,
      );
      setSuccess(
        `${String(result.windows.length)} availability ${result.windows.length === 1 ? "window" : "windows"} published. This does not confirm any customer session.`,
      );
      setEntries(null);
      setKey(crypto.randomUUID());
      setUnknown(false);
      reload();
    } catch (cause) {
      setError(cause);
      setUnknown(uncertain(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section" aria-label="Publish availability">
      <h3>Publish availability</h3>
      <p>
        Choose a single date or a weekly series in {zone}. Every window is 15
        minutes to 12 hours, within the next 90 days. Review each date before
        publishing; no availability repeats indefinitely.
      </p>
      <ErrorNotice error={error} />
      {success && <p role="status">{success}</p>}
      {!entries ? (
        <fieldset disabled={busy}>
          <legend>First availability window</legend>
          <TimeInput
            split
            label="Window start"
            value={start}
            change={setStart}
          />
          <TimeInput split label="Window end" value={end} change={setEnd} />
          <Check label="Repeat weekly" value={weekly} change={setWeekly} />
          {weekly && (
            <Text
              label="Number of weekly dates (1–12)"
              type="number"
              value={count}
              change={setCount}
            />
          )}
          <Action disabled={!start.local || !end.local} onClick={review}>
            Review dates
          </Action>
        </fieldset>
      ) : (
        <>
          <fieldset disabled={busy || unknown}>
            <legend>Review dates and exceptions</legend>
            <p>
              Remove a date to make an exception. Adjust a repeated clock hour
              where daylight saving changes. Publishing checks all dates
              together; any invalid or overlapping window prevents the entire
              series.
            </p>
            {entries.map((entry, index) => (
              <section
                key={index}
                aria-label={`Availability date ${String(index + 1)}`}
              >
                <h4>Date {String(index + 1)}</h4>
                <TimeInput
                  split
                  label={`Date ${String(index + 1)} start`}
                  value={entry.start}
                  change={(value) => {
                    change(index, { ...entry, start: value });
                  }}
                />
                <TimeInput
                  split
                  label={`Date ${String(index + 1)} end`}
                  value={entry.end}
                  change={(value) => {
                    change(index, { ...entry, end: value });
                  }}
                />
                <Action
                  onClick={() => {
                    setEntries(entries.filter((_, i) => i !== index));
                    setKey(crypto.randomUUID());
                  }}
                >
                  Remove date {String(index + 1)}
                </Action>
              </section>
            ))}
            <Action
              onClick={() => {
                setEntries(null);
                setError(null);
              }}
            >
              Back to dates
            </Action>
          </fieldset>
          {unknown && (
            <p role="alert">
              Publication could not be confirmed. Your reviewed dates are
              locked. Retry this same publication safely before making changes.
            </p>
          )}
          <Action
            disabled={busy || !entries.length}
            onClick={() => void publish()}
          >
            {busy
              ? "Publishing…"
              : unknown
                ? "Retry same publication"
                : "Publish reviewed availability"}
          </Action>
        </>
      )}
    </section>
  );
}
