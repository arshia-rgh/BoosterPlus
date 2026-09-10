import { z } from "zod";
export const localTimeSchema = z.object({
  local: z.string(),
  zone: z.string(),
  occurrence: z.enum(["", "first", "second"]),
});
export type LocalTime = z.infer<typeof localTimeSchema>;
export const profileSchema = z.object({
  version: z.number().int(),
  timezone: z.string(),
  enabled: z.boolean(),
  game_tags: z.array(z.string()),
  region_tags: z.array(z.string()),
});
export type CalendarProfile = z.infer<typeof profileSchema>;
export const windowSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  active: z.boolean(),
});
export const calendarSchema = z.object({
  profile: profileSchema,
  windows: z.array(windowSchema),
  next: z.string(),
});
export const bookingSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  version: z.number().int(),
  previous_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  state: z.string(),
  history: z.array(
    z.object({
      version: z.number().int(),
      state: z.string(),
      note: z.string(),
      actor_role: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type Booking = z.infer<typeof bookingSchema>;
export const bookingsSchema = z.object({
  items: z.array(bookingSchema),
  next: z.string(),
});
export const slotsSchema = z.object({
  items: z.array(
    z.object({
      availability_id: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      timezone: z.string(),
    }),
  ),
  next: z.string(),
});
export function localInput(instant: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function timeLabel(instant: string, zone: string) {
  return (
    new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(instant)) +
    " · " +
    zone
  );
}
