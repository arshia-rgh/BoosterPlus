import { useRef, useState, type SubmitEvent } from "react";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { get, post } from "../identity/api";
import { commercialSchema, detailSchema, type Detail } from "./model";
import { z } from "../validation";
import { uncertain } from "../support/chat-state";
import { Agreement } from "./parts";
const previewSchema = z.object({
  data: commercialSchema,
  preview_hash: z.string().min(1),
  order_version: z.number().int(),
});
interface QuoteRequest {
  version: number;
  amount_minor: string;
  currency: string;
  scope: string;
  reason: string;
  lines: { key: string; label: string; amount_minor: string }[];
  delivery_min_hours: number;
  delivery_max_hours: number;
  expires_at: string;
}
export default function QuoteEditor({
  detail,
  done,
}: {
  detail: Detail;
  done: () => void;
}) {
  const [amount, setAmount] = useState(""),
    [currency, setCurrency] = useState(""),
    [scope, setScope] = useState(""),
    [reason, setReason] = useState(""),
    [minimum, setMinimum] = useState(1),
    [maximum, setMaximum] = useState(24),
    [hours, setHours] = useState(48),
    [lines, setLines] = useState<
      { key: string; label: string; amount_minor: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const [review, setReview] = useState<{
    input: QuoteRequest;
    preview: z.infer<typeof previewSchema>;
  } | null>(null);
  const [approved, setApproved] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const stale =
    !!review && review.preview.order_version !== detail.order.version;
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || unknown) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setApproved(false);
    setReview(null);
    setMessage("");
    try {
      const input = {
        version: detail.order.version,
        amount_minor: amount,
        currency,
        scope,
        reason,
        lines,
        delivery_min_hours: minimum,
        delivery_max_hours: maximum,
        expires_at: new Date(Date.now() + hours * 3600000).toISOString(),
      };
      const preview = await post(
        `/admin/orders/${detail.order.id}/quote/preview`,
        input,
        previewSchema,
      );
      setReview({ input, preview });
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function issue() {
    if (lock.current || !review || !approved || stale || unknown) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/orders/${detail.order.id}/quote`,
        { ...review.input, preview_hash: review.preview.preview_hash },
        detailSchema,
      );
      setReview(null);
      setApproved(false);
      setMessage("Quote issued for customer acceptance.");
      done();
    } catch (cause) {
      setError(cause);
      setUnknown(uncertain(cause));
      if (!uncertain(cause)) {
        setReview(null);
        setApproved(false);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function checkOutcome() {
    if (lock.current || !review) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const current = await get(
        `/admin/orders/${detail.order.id}`,
        detailSchema,
      );
      setUnknown(false);
      setApproved(false);
      setReview(null);
      setMessage(
        current.order.version === review.input.version
          ? "No new quote was found. Preview again before issuing."
          : "The order changed. Review its current agreement before preparing another quote.",
      );
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="catalog-section">
      <fieldset
        disabled={busy || unknown}
        onChange={() => {
          setReview(null);
          setApproved(false);
          setMessage("");
        }}
      >
        <legend>
          {detail.quote ? "Issue a replacement quote" : "Issue final quote"}
        </legend>
        <p>
          The customer must accept this quote. All scope, reasons, and line
          items below are visible to them. Issuing a replacement supersedes the
          previous quote.
        </p>
        <div className="catalog-grid">
          <Text
            label="Pre-discount amount in minor units"
            value={amount}
            change={setAmount}
            help="For example, 1234 means 12.34. Do not include a currency symbol."
          />
          <Select
            label="Quote currency"
            value={currency}
            change={setCurrency}
            options={[
              ["", "Choose currency"],
              ["USD", "USD"],
              ["EUR", "EUR"],
              ["GBP", "GBP"],
            ]}
          />
          <NumberInput
            label="Minimum delivery hours"
            value={minimum}
            change={setMinimum}
          />
          <NumberInput
            label="Maximum delivery hours"
            value={maximum}
            change={setMaximum}
          />
          <NumberInput
            label="Quote expires in hours"
            value={hours}
            change={setHours}
          />
        </div>
        <Text label="Agreed scope" value={scope} change={setScope} multiline />
        <Text
          label="Quote explanation"
          value={reason}
          change={setReason}
          multiline
        />
        <p>
          Optional line items must sum exactly to the pre-discount total. Coupon
          eligibility is calculated by the server.
        </p>
        {lines.map((line, index) => (
          <fieldset key={line.key}>
            <legend>Line {index + 1}</legend>
            <Text
              label="Line label"
              value={line.label}
              change={(label) => {
                setLines(
                  lines.map((v) => (v.key === line.key ? { ...v, label } : v)),
                );
              }}
            />
            <Text
              label="Line amount in minor units"
              value={line.amount_minor}
              change={(amount_minor) => {
                setLines(
                  lines.map((v) =>
                    v.key === line.key ? { ...v, amount_minor } : v,
                  ),
                );
              }}
            />
            <Action
              onClick={() => {
                setReview(null);
                setApproved(false);
                setLines(lines.filter((v) => v.key !== line.key));
              }}
            >
              Remove line {index + 1}
            </Action>
          </fieldset>
        ))}
        <Action
          disabled={lines.length >= 20}
          onClick={() => {
            setReview(null);
            setApproved(false);
            setLines([
              ...lines,
              { key: crypto.randomUUID(), label: "", amount_minor: "" },
            ]);
          }}
        >
          Add quote line
        </Action>
        <button className="button" type="submit">
          {busy ? "Preparing…" : "Preview quote"}
        </button>
      </fieldset>
      {message && <p role="status">{message}</p>}
      {review && (
        <section
          aria-label="Customer quote preview"
          className="catalog-section"
        >
          <h3>Customer quote preview · not issued</h3>
          <p>
            This is the exact agreement proposed for this order. Previewing does
            not charge the customer or replace a quote.
          </p>
          {detail.quote && (
            <details>
              <summary>
                Compare with current quote · revision{" "}
                {detail.quote.data.revision}
              </summary>
              <Agreement data={detail.quote.data} />
            </details>
          )}
          <Agreement data={review.preview.data} />
          {stale && (
            <p role="alert">
              This order changed. Preview again before issuing; your edited
              fields are retained.
            </p>
          )}
          <Check
            label="I reviewed the customer-visible price, scope, deadline and terms"
            value={approved}
            change={setApproved}
          />
          <Action
            disabled={busy || unknown || stale || !approved}
            onClick={() => void issue()}
          >
            {busy ? "Working…" : "Issue quote"}
          </Action>
        </section>
      )}
      {unknown && (
        <section aria-label="Quote outcome recovery">
          <p role="alert">
            Issuing was not confirmed. Do not create another quote until the
            latest order has been checked.
          </p>
          <Action disabled={busy} onClick={() => void checkOutcome()}>
            Check latest quote
          </Action>
        </section>
      )}
      <ErrorNotice error={error} />
    </form>
  );
}
