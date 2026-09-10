import { useState, type SubmitEvent } from "react";
import {
  Action,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { post } from "../identity/api";
import { detailSchema, type Detail } from "./model";
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
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/orders/${detail.order.id}/quote`,
        {
          version: detail.order.version,
          amount_minor: amount,
          currency,
          scope,
          reason,
          lines,
          delivery_min_hours: minimum,
          delivery_max_hours: maximum,
          expires_at: new Date(Date.now() + hours * 3600000).toISOString(),
        },
        detailSchema,
      );
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="catalog-section">
      <fieldset disabled={busy}>
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
            setLines([
              ...lines,
              { key: crypto.randomUUID(), label: "", amount_minor: "" },
            ]);
          }}
        >
          Add quote line
        </Action>
        <button className="button" type="submit">
          {busy ? "Issuing…" : "Issue quote"}
        </button>
      </fieldset>
      <ErrorNotice error={error} />
    </form>
  );
}
