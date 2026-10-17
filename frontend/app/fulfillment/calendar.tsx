import "../ui/secondary.css";
import Agenda from "./agenda";
import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { staffSchema } from "./model";
import {
  calendarSchema,
  profileSchema,
  timeLabel,
  type CalendarProfile,
} from "./calendar-model";
import AvailabilityEditor from "./availability-editor";
import { FieldValidation, ValidationSummary } from "../ui/form-validation";
import { useActionValidation } from "../ui/action-validation";
import { profileIssues } from "./validation";
function ProfileEditor({
  profile,
  base,
  reload,
  saving,
  saved,
}: {
  profile: CalendarProfile;
  base: string;
  reload: () => void;
  saving: () => void;
  saved: (restoreFocus: boolean) => void;
}) {
  const [value, setValue] = useState(profile),
    [games, setGames] = useState(profile.game_tags.join(", ")),
    [regions, setRegions] = useState(profile.region_tags.join(", ")),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const validation = useActionValidation();
  const lock = useRef(false),
    editor = useRef<HTMLElement>(null);
  async function save() {
    if (lock.current) return;
    saving();
    const input = {
      ...value,
      game_tags: games
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      region_tags: regions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setError(null);
    if (!validation.check(profileIssues(input))) return;
    const restoreFocus =
      editor.current?.contains(document.activeElement) ?? false;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(base, input, profileSchema);
      saved(
        restoreFocus &&
          (document.activeElement === document.body ||
            !!editor.current?.contains(document.activeElement)),
      );
      reload();
    } catch (cause) {
      setError(cause);
      validation.server(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation.validation}>
      <section className="catalog-section" ref={editor}>
        <h3>Staffing profile</h3>
        <p>
          Tags help manual assignment; they do not grant permissions. Resolve
          confirmed future sessions before pausing the calendar.
        </p>
        <ErrorNotice error={error} hideIssues />
        <ValidationSummary {...validation.validation} />
        <fieldset disabled={busy}>
          <legend>Declared availability</legend>
          <Text
            name="timezone"
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
            name="game_tags"
            label="Game capabilities (comma separated)"
            value={games}
            change={setGames}
          />
          <Text
            name="region_tags"
            label="Regions (comma separated)"
            value={regions}
            change={setRegions}
          />
        </fieldset>
        <button
          type="button"
          className="button compact"
          aria-disabled={busy}
          aria-busy={busy}
          onClick={() => {
            void save();
          }}
        >
          Save calendar profile
        </button>
      </section>
    </FieldValidation>
  );
}
function Calendar({ base }: { base: string }) {
  const [after, setAfter] = useState(""),
    [profileSaved, setProfileSaved] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    resource = useResource(
      `${base}?after=${encodeURIComponent(after)}`,
      calendarSchema,
    ),
    data = resource.error ? null : resource.data;
  const saveResult = useRef<HTMLElement>(null),
    focusSaved = useRef(false);
  useEffect(() => {
    if (profileSaved && !resource.loading && focusSaved.current) {
      focusSaved.current = false;
      // A refresh remounts the saved editor. Restore lost focus only; a person
      // who moved to another control while waiting keeps that position.
      if (document.activeElement === document.body) saveResult.current?.focus();
    }
  }, [profileSaved, resource.loading]);
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
      <h2>
        {base === "/booster/calendar"
          ? "Manage your availability"
          : "Staff calendar"}
      </h2>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh calendar
      </Action>
      {resource.loading && <p role="status">Checking calendar…</p>}
      <ErrorNotice error={resource.error ?? error} />
      {profileSaved && (
        <section
          ref={saveResult}
          tabIndex={-1}
          aria-label="Calendar profile result"
        >
          <p role="status">Calendar profile saved.</p>
          {!!resource.error && (
            <p>
              The save succeeded, but the refreshed calendar is unavailable.
              Refresh the calendar to check its latest details.
            </p>
          )}
        </section>
      )}
      {data && (
        <fieldset
          disabled={resource.loading || busy}
          aria-label="Calendar controls"
        >
          <ProfileEditor
            key={data.profile.version}
            base={base}
            profile={data.profile}
            reload={resource.reload}
            saving={() => {
              focusSaved.current = false;
              setProfileSaved(false);
            }}
            saved={(restoreFocus) => {
              focusSaved.current = restoreFocus;
              setProfileSaved(true);
            }}
          />
          {data.profile.enabled && (
            <AvailabilityEditor
              key={`window-${String(data.profile.version)}`}
              base={base}
              zone={data.profile.timezone}
              reload={resource.reload}
            />
          )}
          <h3>Published availability</h3>
          <p className="calendar-timezone">
            Calendar timezone: <strong>{data.profile.timezone}</strong>.
          </p>
          <p>
            A window with a future confirmed session cannot be removed until
            that session is explicitly cancelled.
          </p>
          {!data.windows.length && <p>No dated windows yet.</p>}
          <ul className="availability-windows">
            {data.windows.map((window) => (
              <li key={window.id} data-active={window.active}>
                <span>
                  {timeLabel(window.starts_at, window.timezone)} –{" "}
                  {timeLabel(window.ends_at, window.timezone)} ·{" "}
                  {window.active ? "Available" : "Removed"}
                </span>
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
  return (
    <>
      <Agenda />
      <Calendar base="/booster/calendar" />
    </>
  );
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
