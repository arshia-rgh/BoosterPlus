import { z } from "../validation";

export const buyerCommissionSchema = z.object({
  version: z.literal("account_commission_v1"),
  base_minor: z.string(),
  fee_minor: z.string(),
  total_minor: z.string(),
});
export const sellerCommissionSchema = z.object({
  version: z.literal("account_commission_v1"),
  base_minor: z.string(),
  fee_minor: z.string(),
  net_minor: z.string(),
  rate: z.string(),
  rate_source: z.string(),
  quoted_at: z.string(),
  net_amount: z.string(),
});
export type BuyerCommission = z.infer<typeof buyerCommissionSchema>;
export type SellerCommission = z.infer<typeof sellerCommissionSchema>;
const validBase = (base: string) => /^[1-9][0-9]{0,11}$/.test(base);
export function buyerCommission(base: string): BuyerCommission | null {
  if (!validBase(base)) return null;
  const value = BigInt(base),
    fee = (value * 5n + 50n) / 100n;
  if (value + fee > 999999999999n) return null;
  return {
    version: "account_commission_v1",
    base_minor: base,
    fee_minor: fee.toString(),
    total_minor: (value + fee).toString(),
  };
}
export function validConversionRate(value: string): boolean {
  const [whole = "", fraction, ...extra] = value.split(".");
  return (
    extra.length === 0 &&
    /^(0|[1-9][0-9]{0,11})$/.test(whole) &&
    (fraction === undefined || /^[0-9]{1,18}$/.test(fraction)) &&
    Number(value) > 0
  );
}
export function sellerCommission(
  base: string,
  rate: string,
  source: string,
  at: string,
): SellerCommission | null {
  if (
    !validBase(base) ||
    !validConversionRate(rate) ||
    !Number.isFinite(Date.parse(at))
  )
    return null;
  const [whole = "", fraction = ""] = rate.split(".");
  const numerator = BigInt(whole + fraction),
    denominator = 10n ** BigInt(fraction.length);
  if (numerator <= 0n) return null;
  const value = BigInt(base),
    fee = (value * 10n + 50n) / 100n,
    net = value - fee;
  const units = net * 10000n * numerator;
  const rounded = (units + denominator - 1n) / denominator;
  return {
    version: "account_commission_v1",
    base_minor: base,
    fee_minor: fee.toString(),
    net_minor: net.toString(),
    rate,
    rate_source: source,
    quoted_at: new Date(at).toISOString(),
    net_amount: `${(rounded / 1000000n).toString()}.${(rounded % 1000000n).toString().padStart(6, "0")}`,
  };
}
