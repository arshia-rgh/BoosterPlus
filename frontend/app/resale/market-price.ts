// The listing contract uses two decimal minor units. Never round a filter with floats.
export function maximumMinor(value: string): string | null {
  if (!value.trim()) return "";
  const parts = value.trim().split(".");
  const whole = parts[0] ?? "";
  const fraction = parts[1] ?? "";
  if (
    parts.length > 2 ||
    !/^\d{1,10}$/.test(whole) ||
    (parts.length === 2 && !/^\d{1,2}$/.test(fraction))
  )
    return null;
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return amount > 0n && amount <= 999999999999n ? amount.toString() : null;
}
export function maximumDisplay(value: string): string {
  if (!/^[1-9][0-9]{0,11}$/.test(value)) return "";
  const amount = BigInt(value);
  return `${(amount / 100n).toString()}.${(amount % 100n).toString().padStart(2, "0")}`;
}
