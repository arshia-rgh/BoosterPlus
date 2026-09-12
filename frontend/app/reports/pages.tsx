import { useState, type SubmitEvent } from "react";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import {
  downloadReport,
  exportSchema,
  reportSchema,
  type Query,
  type Report,
} from "./model";
const filters = new Map<Query["kind"], readonly string[]>(
  Object.entries({
    orders: [
      "submitted",
      "needs_information",
      "quoted",
      "awaiting_payment",
      "queued",
      "in_progress",
      "on_hold",
      "completed",
      "rejected",
      "cancelled",
      "expired",
    ],
    catalog: ["draft", "published", "paused", "archived"],
    staff: ["active", "suspended"],
    audits: [],
    receipts: ["confirmed", "detected", "reversed"],
    refunds: [
      "recipient_pending",
      "verified",
      "approved",
      "creating",
      "created",
      "verifying",
      "uncertain",
      "confirmed",
      "failed",
      "cancelled",
      "exception",
    ],
    payouts: [
      "recipient_pending",
      "verified",
      "approved",
      "creating",
      "created",
      "verifying",
      "uncertain",
      "confirmed",
      "failed",
      "cancelled",
      "exception",
    ],
  }) as [Query["kind"], readonly string[]][],
);
export default function Reports() {
  const [kind, setKind] = useState<Query["kind"]>("orders"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [state, setState] = useState(""),
    [search, setSearch] = useState(""),
    [preview, setPreview] = useState<Report | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState("");
  function edit(change: () => void) {
    change();
    setPreview(null);
    setError(null);
    setMessage("");
  }
  async function load(query: Query) {
    setBusy(true);
    setError(null);
    setMessage("");
    setPreview(null);
    try {
      setPreview(await post("/admin/reports/preview", query, reportSchema));
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({
      kind,
      from: from + "T00:00:00Z",
      to: to + "T00:00:00Z",
      state,
      search,
      after: "",
    });
  }
  async function download() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const value = await post(
        "/admin/reports/export",
        { query: preview.query, digest: preview.digest, reason },
        exportSchema,
      );
      downloadReport(value);
      setMessage("Report page downloaded. Audit reference: " + value.audit_id);
    } catch (cause) {
      setPreview(null);
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Operational reports</h2>
      <p>
        Preview and download up to 100 records per page. Financial reports show
        exact crypto quantities by asset and network and distinguish confirmed
        evidence from pending obligations. Each report states its date and
        recognition basis; no exchange conversion or revenue total is inferred.
        Audit reports are restricted to the owner.
      </p>
      <form className="report-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend>Report filters</legend>
          <Select
            label="Report"
            value={kind}
            change={(value) => {
              const parsed = (
                [
                  "orders",
                  "catalog",
                  "staff",
                  "audits",
                  "receipts",
                  "refunds",
                  "payouts",
                ] as const
              ).find((item) => item === value);
              if (parsed)
                edit(() => {
                  setKind(parsed);
                  setState("");
                });
            }}
            options={[
              ["orders", "Orders"],
              ["receipts", "Payment receipts"],
              ["refunds", "Refund obligations"],
              ["payouts", "Seller payouts"],
              ["catalog", "Catalog"],
              ["staff", "Staff"],
              ["audits", "Audit events (owner)"],
            ]}
          />
          <label>
            From date (UTC, inclusive)
            <input
              type="date"
              required
              value={from}
              onChange={(event) => {
                edit(() => {
                  setFrom(event.target.value);
                });
              }}
            />
          </label>
          <label>
            Until date (UTC, exclusive)
            <input
              type="date"
              required
              value={to}
              onChange={(event) => {
                edit(() => {
                  setTo(event.target.value);
                });
              }}
            />
          </label>
          <Select
            label="Current status"
            value={state}
            change={(value) => {
              edit(() => {
                setState(value);
              });
            }}
            options={[
              ["", "All"],
              ...(filters.get(kind) ?? []).map(
                (value) => [value, value] as [string, string],
              ),
            ]}
          />
          <Text
            label="Search name, alias, action or exact record ID"
            value={search}
            change={(value) => {
              edit(() => {
                setSearch(value);
              });
            }}
          />
          <button type="submit" className="button">
            Preview report
          </button>
        </fieldset>
      </form>
      <ErrorNotice error={error} />
      {busy && <p role="status">Preparing report…</p>}
      {message && <p role="status">{message}</p>}
      {preview && (
        <>
          <h3>
            Preview: {preview.count}{" "}
            {preview.count === 1 ? "record" : "records"}
          </h3>
          <p>{preview.basis}</p>
          <p>
            Generated at {preview.observed_at}. Text is preserved exactly in the
            JSON download.
          </p>
          {preview.count === 0 ? (
            <p>No records match these filters.</p>
          ) : (
            <div
              className="report-scroll"
              role="region"
              aria-label="Operational report table"
              tabIndex={0}
            >
              <table>
                <caption>{preview.kind} report page</caption>
                <thead>
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={row[0] ?? String(index)}>
                      {row.map((cell, i) => (
                        <td key={preview.columns.at(i)?.key ?? String(i)}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Text
            label="Reason for export"
            value={reason}
            change={setReason}
            multiline
          />
          <p>
            Downloading requires recent email/Google and authenticator
            verification. If records change, refresh the preview before
            downloading.
          </p>
          <Action
            disabled={busy || reason.trim() === ""}
            onClick={() => void download()}
          >
            Download this page (.json)
          </Action>
          {preview.next && (
            <Action
              disabled={busy}
              onClick={() =>
                void load({ ...preview.query, after: preview.next })
              }
            >
              Next report page
            </Action>
          )}
          {preview.query.after && (
            <Action
              disabled={busy}
              onClick={() => void load({ ...preview.query, after: "" })}
            >
              First report page
            </Action>
          )}
        </>
      )}
    </section>
  );
}
