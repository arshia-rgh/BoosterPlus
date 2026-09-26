import { z } from "../validation";
export const routeSchema = z.object({
  code: z.string(),
  label: z.string(),
  network: z.string(),
});
export const remedySchema = z.object({
  cancellation: z.string(),
  partial_work: z.string(),
  no_show: z.string(),
  missed_target: z.string(),
  refund_basis: z.string(),
  refund_fees: z.string(),
  dispute_hours: z.number().int(),
  appeal_hours: z.number().int(),
  max_appeals: z.number().int(),
});
export const remedyLabels = [
  ["cancellation", "Cancellation terms"],
  ["partial_work", "Partial work terms"],
  ["no_show", "No-show terms"],
  ["missed_target", "Missed target terms"],
  ["refund_basis", "Refund calculation terms"],
  ["refund_fees", "Refund fee terms"],
] as const;
export const emptyRemedies = {
  cancellation: "",
  partial_work: "",
  no_show: "",
  missed_target: "",
  refund_basis: "",
  refund_fees: "",
  dispute_hours: 0,
  appeal_hours: 0,
  max_appeals: 0,
};
export const policySchema = z.object({
  remedies: remedySchema.nullable(),
  label: z.string(),
  text: z.string(),
  currencies: z.array(z.string()),
  routes: z.array(routeSchema),
  fee_mode: z.string(),
  rate_mode: z.string(),
  window_minutes: z.number().int(),
});
export type Policy = z.infer<typeof policySchema>;
const publishedSchema = z.object({ id: z.string(), data: policySchema });
// A stored or compromised API response must not turn payment links into arbitrary navigation.
export function safeCheckout(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "nowpayments.io" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/payment/" &&
      url.hash === "" &&
      /^[1-9][0-9]{0,31}$/.test(url.searchParams.get("iid") ?? "") &&
      [...url.searchParams.keys()].length === 1
    );
  } catch {
    return false;
  }
}
// New fields have closed defaults for rolling responses; absent evidence never
// produces an address or a native payment instruction.
export const depositSchema = z.object({
  payment_id: z.string().regex(/^[1-9][0-9]{0,31}$/),
  address: z.string().regex(/^[a-zA-Z0-9_-]{8,256}$/),
  memo: z
    .string()
    .max(128)
    .regex(/^[\x20-\x7e]*$/),
  amount: z
    .string()
    .max(200)
    .refine((value) => {
      const parts = value.split(".");
      return (
        parts.length <= 2 &&
        /^(0|[1-9][0-9]*)$/.test(parts[0] ?? "") &&
        (parts.length === 1 || /^[0-9]+$/.test(parts[1] ?? ""))
      );
    }),
  currency: z.string(),
  network: z.string(),
  expires_at: z.iso.datetime({ offset: true }),
  checked_at: z.iso.datetime({ offset: true }),
  valid_until: z.iso.datetime({ offset: true }),
  qr: z
    .string()
    .max(30000)
    .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+=*$/),
});
export const attemptSchema = z.object({
  native_checkout: z.boolean().default(false),
  instruction_status: z
    .enum([
      "not_applicable",
      "preparing",
      "ready",
      "refreshing",
      "expired",
      "review_required",
      "closed",
    ])
    .default("not_applicable"),
  deposit: depositSchema.nullable().default(null),
  id: z.string(),
  order_id: z.string(),
  state: z.string(),
  issue: z.string(),
  currency: z.string(),
  amount_minor: z.string(),
  route: routeSchema,
  policy: publishedSchema,
  checkout_url: z.string().refine(safeCheckout),
  created_at: z.string(),
  expires_at: z.string(),
});
export const receiptSchema = z.object({
  id: z.string(),
  state: z.string(),
  currency: z.string(),
  network: z.string(),
  amount: z.string(),
  allocated_currency: z.string(),
  allocated_minor: z.string(),
  created_at: z.string(),
});
export const historySchema = z.object({
  server_time: z.string().default(""),
  enabled: z.boolean(),
  policy: publishedSchema.nullable(),
  attempts: z.array(attemptSchema),
  receipts: z.array(receiptSchema),
});
export const settingsSchema = z.object({
  version: z.number().int(),
  draft: policySchema,
  published: publishedSchema.nullable(),
  configured: z.boolean(),
  enabled: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const financeSchema = z.object({
  enabled: z.boolean(),
  next: z.string(),
  attempts: z.array(attemptSchema),
  records: z.array(
    z.object({
      id: z.string(),
      payment_id: z.string(),
      attempt_id: z.string(),
      state: z.string(),
      issue: z.string(),
      checked_at: z.string(),
    }),
  ),
});
const descriptions = new Map([
  ["new", "Preparing your secure checkout."],
  ["creating", "Requesting your payment link. Keep this page open."],
  [
    "uncertain",
    "The payment provider has not confirmed invoice creation. We are reconciling it; do not create another payment.",
  ],
  [
    "awaiting_payment",
    "Your checkout is ready. Use only the selected asset and network.",
  ],
  [
    "confirming",
    "Funds detected. Waiting for the provider to finish processing.",
  ],
  ["settled", "Payment verified and allocated to your order."],
  ["closed", "This checkout is closed. Do not pay using an old link."],
  [
    "exception",
    "This payment needs financial review. Contact support before sending more funds.",
  ],
  [
    "underpaid",
    "The received amount is insufficient. Contact support before sending more funds.",
  ],
  [
    "overpaid",
    "Your order is paid. The extra amount is recorded for financial review.",
  ],
  [
    "wrong_route",
    "Funds were reported in a different asset or network. Financial review is required.",
  ],
  [
    "timing_review",
    "Funds were first detected after the local checkout window. Financial review is required.",
  ],
  [
    "retired_contract",
    "Funds arrived for a closed agreement. The order has not been reactivated.",
  ],
  [
    "duplicate_payment",
    "Another payment already funded this agreement. Additional funds require review.",
  ],
  [
    "payment_reversed",
    "The provider reported a reversal. Work is on hold for financial review.",
  ],
  [
    "invoice_uncertain",
    "Invoice creation is being reconciled. Do not start another payment.",
  ],
]);
export function paymentMessage(state: string, issue = "") {
  return (
    descriptions.get(issue) ||
    descriptions.get(state) ||
    "Payment information is being reconciled. Contact support if you need help."
  );
}

export function remedyText(
  value: z.infer<typeof remedySchema>,
  key: (typeof remedyLabels)[number][0],
): string {
  switch (key) {
    case "cancellation":
      return value.cancellation;
    case "partial_work":
      return value.partial_work;
    case "no_show":
      return value.no_show;
    case "missed_target":
      return value.missed_target;
    case "refund_basis":
      return value.refund_basis;
    case "refund_fees":
      return value.refund_fees;
  }
}
