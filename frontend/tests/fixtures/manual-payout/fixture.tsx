import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { TransferRecord } from "../../../app/payments/refunds";
import { useManualPayoutConfirmation } from "../../../app/payments/manual-payout";
import { ActionVerificationDialog } from "../../../app/identity/action-verification-dialog";
import type { Transfer } from "../../../app/payments/cases-model";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
const mode = new URLSearchParams(location.search).get("state") ?? "ready";
document.body.dataset.portal = mode === "seller" ? "customer" : "admin";
export const fixtureTransfer: Transfer = {
  id: "synthetic-payout",
  order_id: "",
  case_id: "",
  receipt_id: "",
  kind: "seller_payout",
  currency: "usdtbsc",
  network: "bsc",
  amount: "90.000000",
  terms:
    "Accepted synthetic offer: USD 100 base, 10% seller commission, USD 90 net at the agreed quote of 1 USDT per USD. Sending fees are paid by PLAYORA.",
  state: "verified",
  issue: "",
  version: 3,
  recipient: { address: `0x${"1".repeat(40)}`, memo: "" },
  recipient_at: "2026-01-01T00:00:00Z",
  approved_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  manual_recording: {
    available: mode !== "held",
    reason: mode === "held" ? "eligibility_hold" : "",
  },
};
function App() {
  const [record, setRecord] = useState(fixtureTransfer);
  const [error, setError] = useState<unknown>(null);
  const confirmation = useManualPayoutConfirmation("synthetic-payout", error);
  const completed = mode === "seller" || mode === "completed";
  const shown: Transfer = completed
    ? {
        ...record,
        state: "confirmed",
        manual_receipt: {
          id: "synthetic-receipt",
          transaction_hash: `0x${"ab".repeat(32)}`,
          completed_at: "2026-01-02T00:00:00Z",
          recorded_at: "2026-01-02T01:00:00Z",
        },
      }
    : record;
  return (
    <main
      className="catalog-page"
      style={{ maxWidth: 960, margin: "auto", padding: "1rem" }}
    >
      <h1>Seller payout</h1>
      <p>Isolated preview · synthetic data · no real transfers</p>
      <h2>Accepted offer and payout record</h2>
      {confirmation.feedback}
      <TransferRecord
        key={`${shown.id}:${String(shown.version)}`}
        record={shown}
        admin={mode !== "seller"}
        owner={mode !== "seller"}
        refreshing={false}
        reload={() => {
          if (mode === "read-failure") setError(new Error("Read unavailable"));
        }}
        onManualSaved={(saved) => {
          confirmation.manualSaved(saved);
          setRecord(saved);
        }}
      />
      <ActionVerificationDialog />
    </main>
  );
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
