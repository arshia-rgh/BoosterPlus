/** Interpret provider/server Retry-After; absence or invalid input never invents a cooldown. */
export function retryTime(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value || value.length > 80) return undefined;
  const seconds = /^\d+$/.test(value);
  if (
    !seconds &&
    !/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)
  )
    return undefined;
  const target = seconds
    ? now + Number(value) * 1000
    : Math.max(now, Date.parse(value));
  return Number.isFinite(target) &&
    target >= now &&
    target - now <= 7 * 24 * 3600 * 1000
    ? target
    : undefined;
}
export function retryLabel(time: number) {
  return new Date(time)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}
