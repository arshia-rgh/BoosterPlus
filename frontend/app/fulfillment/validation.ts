import type { FieldIssue } from "../ui/form-validation";
import type { LocalTime, CalendarProfile } from "./calendar-model";
export function profileIssues(profile: CalendarProfile): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (
    !validZone(profile.timezone) ||
    !/^[A-Za-z0-9_+/-]{1,64}$/.test(profile.timezone) ||
    profile.timezone === "Local"
  )
    issues.push({
      path: "timezone",
      message:
        "Enter an IANA time zone such as UTC, Europe/London or Asia/Tehran.",
    });
  for (const [path, tags] of [
    ["game_tags", profile.game_tags],
    ["region_tags", profile.region_tags],
  ] as const) {
    if (
      tags.length > 12 ||
      new Set(tags).size !== tags.length ||
      tags.some(
        (tag) =>
          !tag.trim() ||
          tag !== tag.trim() ||
          Array.from(tag).length > 48 ||
          tag.includes("\0"),
      )
    )
      issues.push({
        path,
        message: "Use up to 12 different tags, each 1–48 characters long.",
      });
  }
  return issues;
}
export function validZone(zone: string) {
  try {
    return !!new Intl.DateTimeFormat("en", { timeZone: zone }).resolvedOptions()
      .timeZone;
  } catch {
    return false;
  }
}
export function localTimeIssues(
  value: LocalTime,
  path: string,
  split = false,
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const [date = "", time = ""] = value.local.split("T");
  const at = Date.parse(value.local + ":00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
  )
    issues.push({
      path: `${path}.${split ? "date" : "local"}`,
      message: "Choose a valid calendar date.",
    });
  if (
    !/^\d{2}:\d{2}$/.test(time) ||
    !Number.isFinite(at) ||
    new Date(at).toISOString().slice(11, 16) !== time
  )
    issues.push({
      path: `${path}.${split ? "time" : "local"}`,
      message: "Choose a valid local time.",
    });
  return issues;
}
/** Local syntax only: the server resolves IANA offsets, DST and overlapping bookings. */
export function windowIssues(
  start: LocalTime,
  end: LocalTime,
  prefix = "",
  split = false,
): FieldIssue[] {
  const issues = [
    ...localTimeIssues(start, `${prefix}start`, split),
    ...localTimeIssues(end, `${prefix}end`, split),
  ];
  if (!issues.length && start.zone === "UTC" && end.zone === "UTC") {
    const duration =
      Date.parse(end.local + ":00Z") - Date.parse(start.local + ":00Z");
    if (duration < 15 * 60 * 1000 || duration > 12 * 60 * 60 * 1000)
      issues.push({
        path: `${prefix}end.${split ? "time" : "local"}`,
        message: "End the window 15 minutes to 12 hours after its start.",
      });
  }
  return issues;
}
export function noteIssues(note: string, path = "note"): FieldIssue[] {
  return note.trim().length > 0 &&
    Array.from(note).length <= 2000 &&
    !note.includes("\0")
    ? []
    : [
        {
          path,
          message:
            "Enter a reason of 1–2,000 characters without account credentials.",
        },
      ];
}
