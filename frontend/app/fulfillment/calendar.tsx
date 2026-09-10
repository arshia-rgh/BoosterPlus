import { useState } from "react";
import { z } from "zod";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { staffSchema } from "./model";
import {
  calendarSchema,
  profileSchema,
  windowSchema,
  timeLabel,
  type CalendarProfile,
  type LocalTime,
} from "./calendar-model";
import TimeInput from "./time-input";
function ProfileEditor({
  profile,
  base,
  reload,
}: {
  profile: CalendarProfile;
  base: string;
  reload: () => void;
}) {
  const [value, setValue] = useState(profile),
    [games, setGames] = useState(profile.game_tags.join(", ")),
    [regions, setRegions] = useState(profile.region_tags.join(", ")),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        base,
        {
          ...value,
          game_tags: games
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          region_tags: regions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        profileSchema,
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
      <h3>Staffing profile</h3>
      <p>
        Tags help manual assignment; they do not grant permissions. Resolve
        confirmed future sessions before pausing the calendar.
      </p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Declared availability</legend>
        <Text
          label="Calendar time zone (IANA)"
          value={value.timezone}
          change={(timezone) => {
            setValue({ ...value, timezone });
          }}
          help="For example UTC, Asia/Tehran or Europe/London."
        />
        <Check
          label="Accept new session bookings"
          value={value.enabled}
          change={(enabled) => {
            setValue({ ...value, enabled });
          }}
        />
        <Text
          label="Game capabilities (comma separated)"
          value={games}
          change={setGames}
        />
        <Text
          label="Regions (comma separated)"
          value={regions}
          change={setRegions}
        />
      </fieldset>
      <Action
        disabled={busy}
        onClick={() => {
          void save();
        }}
      >
        Save calendar profile
      </Action>
    </section>
  );
}
function AddWindow({
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
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        base + "/windows",
        { request_key: key, start, end },
        windowSchema,
      );
      setKey(crypto.randomUUID());
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>Publish a dated availability window</h3>
      <p>
        Times are in {zone}. Publish 15-minute to 12-hour windows within the
        next 90 days. Windows cannot overlap.
      </p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Availability times</legend>
        <TimeInput
          label="Window start"
          value={start}
          change={(value) => {
            setStart(value);
            setKey(crypto.randomUUID());
          }}
        />
        <TimeInput
          label="Window end"
          value={end}
          change={(value) => {
            setEnd(value);
            setKey(crypto.randomUUID());
          }}
        />
      </fieldset>
      <Action
        disabled={busy || !start.local || !end.local}
        onClick={() => {
          void save();
        }}
      >
        Publish availability
      </Action>
    </section>
  );
}
function Calendar({ base }: { base: string }) {
  const [after, setAfter] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    resource = useResource(
      `${base}?after=${encodeURIComponent(after)}`,
      calendarSchema,
    ),
    data = resource.error ? null : resource.data;
  async function remove(id: string, version: number) {
    setBusy(true);
    setError(null);
    try {
      await post(`${base}/windows/${id}/remove`, { version }, z.unknown());
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Staff calendar</h2>
      <Action onClick={resource.reload}>Refresh calendar</Action>
      <ErrorNotice error={resource.error ?? error} />
      {data && (
        <fieldset disabled={resource.loading || busy}>
          <legend>Calendar controls</legend>
          <ProfileEditor
            key={data.profile.version}
            base={base}
            profile={data.profile}
            reload={resource.reload}
          />
          {data.profile.enabled && (
            <AddWindow
              key={`window-${String(data.profile.version)}`}
              base={base}
              zone={data.profile.timezone}
              reload={resource.reload}
            />
          )}
          <h3>Published availability</h3>
          <p>
            A window with a future confirmed session cannot be removed until
            that session is explicitly cancelled.
          </p>
          {!data.windows.length && <p>No dated windows yet.</p>}
          <ul>
            {data.windows.map((window) => (
              <li key={window.id}>
                {timeLabel(window.starts_at, window.timezone)} –{" "}
                {timeLabel(window.ends_at, window.timezone)} ·{" "}
                {window.active ? "Available" : "Removed"}{" "}
                {window.active && (
                  <Action
                    onClick={() => {
                      void remove(window.id, window.version);
                    }}
                  >
                    Remove window
                  </Action>
                )}
              </li>
            ))}
          </ul>
          {data.next && (
            <Action
              onClick={() => {
                setAfter(data.next);
              }}
            >
              More windows
            </Action>
          )}
          {after && (
            <Action
              onClick={() => {
                setAfter("");
              }}
            >
              Earliest windows
            </Action>
          )}
        </fieldset>
      )}
    </section>
  );
}
export function BoosterCalendar() {
  return <Calendar base="/booster/calendar" />;
}
export function AdminCalendar() {
  const staff = useResource("/admin/fulfillment/staff", staffSchema),
    [id, setID] = useState("");
  return (
    <section>
      <h2>Manage staff calendars</h2>
      <ErrorNotice error={staff.error} />
      <Select
        label="Staff calendar to manage"
        value={id}
        options={[
          ["", "Choose staff"],
          ...(staff.data?.staff.map(
            (s) =>
              [s.id, `${s.alias} · ${s.role} · ${s.id.slice(0, 8)}`] as const,
          ) ?? []),
        ]}
        change={setID}
      />
      {id && <Calendar key={id} base={`/admin/staff/${id}/calendar`} />}
    </section>
  );
}
