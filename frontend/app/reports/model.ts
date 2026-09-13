import { z } from "../validation";
export const querySchema = z.object({
  kind: z.enum([
    "orders",
    "catalog",
    "staff",
    "audits",
    "receipts",
    "refunds",
    "payouts",
  ]),
  from: z.string(),
  to: z.string(),
  state: z.string(),
  search: z.string(),
  after: z.string(),
});
export type Query = z.infer<typeof querySchema>;
export const reportSchema = z.object({
  kind: z.string(),
  basis: z.string(),
  observed_at: z.string(),
  query: querySchema,
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.array(z.string())).max(100),
  next: z.string(),
  count: z.number().int().min(0).max(100),
  digest: z.string(),
});
export type Report = z.infer<typeof reportSchema>;
export const exportSchema = z.object({
  report: reportSchema,
  audit_id: z.string(),
});
export type Export = z.infer<typeof exportSchema>;
export function downloadReport(value: Export) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "playora-operational-report.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
