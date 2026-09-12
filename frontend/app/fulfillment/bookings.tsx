import { useState } from "react";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { active, type Work } from "./model";
import {
  bookingSchema,
  bookingsSchema,
  slotsSchema,
  timeLabel,
  localInput,
  type Booking,
  type LocalTime,
} from "./calendar-model";
import TimeInput from "./time-input";
function Proposal({
  work,
  previous,
  reload,
}: {
  work: Work;
  previous: Booking | null;
  reload: () => void;
}) {
  const [week, setWeek] = useState("0"),
    [after, setAfter] = useState(""),
    [selected, setSelected] = useState(""),
    [zone, setZone] = useState("UTC"),
    [start, setStart] = useState<LocalTime>({
      local: "",
      zone: "UTC",
      occurrence: "",
    }),
    [end, setEnd] = useState<LocalTime>({
      local: "",
      zone: "UTC",
      occurrence: "",
    }),
    [note, setNote] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    slots = useResource(
      `/fulfillment/${work.order_id}/slots?week=${week}&after=${encodeURIComponent(after)}`,
      slotsSchema,
    );
  const selectedSlot = slots.data?.items.find(
    (s) => `${s.availability_id}:${s.starts_at}` === selected,
  );
  function edit() {
    setKey(crypto.randomUUID());
  }
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/fulfillment/${work.order_id}/bookings`,
        {
          work_version: work.version,
          request_key: key,
          availability_id: selectedSlot?.availability_id ?? "",
          start: { ...start, zone },
          end: { ...end, zone },
          previous_id: previous?.id ?? "",
          previous_version: previous?.version ?? 0,
          note,
        },
        bookingSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>
        {previous ? "Propose a replacement session" : "Propose a session"}
      </h3>
      <p>
        A proposal reserves nothing until staff confirms it. Rescheduling
        cancels the old session and keeps its history. No fee or price change is
        applied here.
      </p>
      <ErrorNotice error={error ?? slots.error} />
      <fieldset disabled={busy}>
        <legend>Session proposal</legend>
        <Select
          label="Availability period"
          value={week}
          options={Array.from(
            { length: 13 },
            (_, i) =>
              [
                String(i),
                i === 0
                  ? "Next 7 days"
                  : `${String(i * 7 + 1)}–${String(Math.min(90, (i + 1) * 7))} days ahead`,
              ] as const,
          )}
          change={(value) => {
            setWeek(value);
            setAfter("");
            setSelected("");
            edit();
          }}
        />
        <Select
          label="Available window"
          value={selected}
          options={[
            ["", "Choose available times"],
            ...(slots.data?.items.map(
              (slot) =>
                [
                  `${slot.availability_id}:${slot.starts_at}`,
                  `${timeLabel(slot.starts_at, slot.timezone)} – ${timeLabel(slot.ends_at, slot.timezone)}`,
                ] as const,
            ) ?? []),
          ]}
          change={(value) => {
            setSelected(value);
            edit();
            const slot = slots.data?.items.find(
              (s) => `${s.availability_id}:${s.starts_at}` === value,
            );
            if (slot) {
              try {
                setStart({
                  local: localInput(slot.starts_at, zone),
                  zone,
                  occurrence: "",
                });
                setEnd({
                  local: localInput(slot.ends_at, zone),
                  zone,
                  occurrence: "",
                });
              } catch (cause) {
                setError(cause);
              }
            }
          }}
        />
        {slots.data?.next && (
          <Action
            onClick={() => {
              setAfter(slots.data?.next ?? "");
              setSelected("");
            }}
          >
            More available windows
          </Action>
        )}
        {after && (
          <Action
            onClick={() => {
              setAfter("");
              setSelected("");
            }}
          >
            First available windows
          </Action>
        )}
        {slots.data?.items.length === 0 && (
          <p>
            No free windows in this period. Ask support or select another
            period.
          </p>
        )}
        <Text
          label="Session time zone (IANA)"
          value={zone}
          change={(value) => {
            setZone(value);
            edit();
          }}
          help="Enter local start/end times for this zone. Repeated clock hours require an explicit occurrence."
        />
        <TimeInput
          label="Session start"
          value={start}
          change={(value) => {
            setStart(value);
            edit();
          }}
        />
        <TimeInput
          label="Session end"
          value={end}
          change={(value) => {
            setEnd(value);
            edit();
          }}
        />
        <Text
          label="Session note"
          value={note}
          change={(value) => {
            setNote(value);
            edit();
          }}
          help="Ordinary coordination only; do not enter credentials."
        />
      </fieldset>
      <Action
        disabled={
          busy ||
          !selectedSlot ||
          !note.trim() ||
          slots.loading ||
          !!slots.error
        }
        onClick={() => {
          void save();
        }}
      >
        Submit session proposal
      </Action>
    </section>
  );
}
export default function Bookings({
  work,
  audience,
  reload,
}: {
  work: Work;
  audience: "account" | "admin" | "booster";
  reload: () => void;
}) {
  const base = `${audience === "account" ? "" : "/" + audience}/fulfillment/${work.order_id}`,
    [after, setAfter] = useState(""),
    [note, setNote] = useState(""),
    [previous, setPrevious] = useState<Booking | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    resource = useResource(
      `${base}/bookings?after=${encodeURIComponent(after)}&revision=${String(work.version)}`,
      bookingsSchema,
    );
  async function change(value: Booking, action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `${base}/bookings/${value.id}/${action}`,
        { version: value.version, note },
        bookingSchema,
      );
      resource.reload();
      reload();
      setNote("");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  const refresh = () => {
    setPrevious(null);
    resource.reload();
    reload();
  };
  return (
    <section className="catalog-section">
      <h3>Play-together sessions</h3>
      <p>
        Propose a time, then wait for staff confirmation. Work can begin after
        the required player information is saved and a current session is
        confirmed.
      </p>
      <ErrorNotice error={error ?? resource.error} />
      <fieldset disabled={busy || resource.loading}>
        <legend>Session controls</legend>
        <Text label="Session action reason" value={note} change={setNote} />
        {!resource.error &&
          resource.data?.items.map((value) => (
            <article className="catalog-section" key={value.id}>
              <h4>{value.state.replaceAll("_", " ")}</h4>
              <p>
                {timeLabel(value.starts_at, value.timezone)} –{" "}
                {timeLabel(value.ends_at, value.timezone)}
              </p>
              <p>
                Your local time:{" "}
                {timeLabel(
                  value.starts_at,
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                )}{" "}
                –{" "}
                {timeLabel(
                  value.ends_at,
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                )}
              </p>
              {value.previous_id && <p>Replacement for an earlier session.</p>}
              <details>
                <summary>Session history</summary>
                <ol>
                  {value.history.map((event) => (
                    <li key={event.version}>
                      {event.state.replaceAll("_", " ")} · {event.note} ·{" "}
                      {new Date(event.created_at).toLocaleString()}
                    </li>
                  ))}
                </ol>
              </details>
              {active(work) &&
                (value.state === "proposed" || value.state === "confirmed") && (
                  <div className="catalog-actions">
                    {audience !== "account" && value.state === "proposed" && (
                      <Action
                        disabled={!note.trim()}
                        onClick={() => {
                          void change(value, "confirm");
                        }}
                      >
                        Confirm session
                      </Action>
                    )}
                    <Action
                      disabled={!note.trim()}
                      onClick={() => {
                        void change(value, "cancel");
                      }}
                    >
                      Cancel session
                    </Action>
                    {audience === "account" && (
                      <Action
                        onClick={() => {
                          setPrevious(value);
                        }}
                      >
                        Reschedule session
                      </Action>
                    )}
                  </div>
                )}
              {audience !== "account" &&
                value.state === "confirmed" &&
                new Date(value.starts_at) <= new Date() && (
                  <div className="catalog-actions">
                    <Action
                      disabled={!note.trim()}
                      onClick={() => {
                        void change(value, "attended");
                      }}
                    >
                      Mark attended
                    </Action>
                    <Action
                      disabled={
                        !note.trim() || new Date(value.ends_at) > new Date()
                      }
                      onClick={() => {
                        void change(value, "no_show");
                      }}
                    >
                      Record no-show
                    </Action>
                  </div>
                )}
            </article>
          ))}
        {resource.data?.items.length === 0 && <p>No sessions proposed.</p>}
        {resource.data?.next && (
          <Action
            onClick={() => {
              setAfter(resource.data?.next ?? "");
            }}
          >
            Older sessions
          </Action>
        )}
        {after && (
          <Action
            onClick={() => {
              setAfter("");
            }}
          >
            Newest sessions
          </Action>
        )}
      </fieldset>
      {audience === "account" && active(work) && (
        <Proposal
          key={`${String(work.version)}:${previous?.id ?? "new"}`}
          work={work}
          previous={previous}
          reload={refresh}
        />
      )}
    </section>
  );
}
