import { Link, useSearchParams } from "react-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import { transferSchema } from "../payments/cases-model";
import { TransferRecord } from "../payments/refunds";
const queueSchema = z.object({
  items: z.array(
    z.object({
      transfer: transferSchema,
      submission_id: z.string(),
      eligible: z.boolean(),
      due_at: z.string().nullable(),
    }),
  ),
  next: z.string(),
});
export default function SellerPayoutQueue() {
  const [params, setParams] = useSearchParams();
  const after = params.get("payoutAfter") ?? "";
  const setAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), payoutAfter: after });
  };
  const resource = useResource(
      `/admin/finance/payouts?after=${encodeURIComponent(after)}`,
      queueSchema,
    ),
    session = useResource("/auth/session", sessionSchema);
  return (
    <section className="catalog-section">
      <h2>Seller payout obligations</h2>
      <p>
        Each amount belongs to an accepted seller offer. Buy-first offers
        require verified ownership control; consignment requires buyer
        acknowledgement, settled payment and the end of the dispute window.
        Active disputes or unresolved refunds hold consignment payouts for
        review.
      </p>
      <Action onClick={resource.reload}>Refresh payout queue</Action>
      <ErrorNotice error={resource.error ?? session.error} />
      {resource.data?.items.map((item) => (
        <section key={item.transfer.id}>
          <Link
            to={`/admin/submissions/${item.submission_id}?section=payout`}
            state={{ financeSearch: params.toString() }}
          >
            Review seller payout and agreement
          </Link>
          <p>
            {item.eligible
              ? "Currently eligible for authorization"
              : "Conditions require review before authorization"}
            {item.due_at
              ? ` · Due ${new Date(item.due_at).toLocaleString()}`
              : ""}
          </p>
          <TransferRecord
            key={`${item.transfer.id}:${String(item.transfer.version)}`}
            record={item.transfer}
            admin
            owner={session.data?.user?.role === "owner"}
            reload={resource.reload}
            refreshing={resource.loading}
          />
        </section>
      ))}
      {resource.data?.items.length === 0 && (
        <p>No outstanding seller obligations.</p>
      )}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          More seller obligations
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First seller obligations
        </Action>
      )}
    </section>
  );
}
