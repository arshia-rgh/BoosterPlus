import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { ProductFields } from "../../../app/shop/fields";
import { ProductPreview } from "../../../app/shop/preview";
import { Agreement } from "../../../app/orders/parts";
import type { Commercial } from "../../../app/orders/model";
import { supplierProduct } from "../supplier-shop/data";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/orders/admin-workspace.css";
import "../../../app/shop/shop.css";

const params = new URLSearchParams(location.search);
const method =
  params.get("method") === "account"
    ? "account"
    : params.get("method") === "code"
      ? "code"
      : "id";
const historical = params.get("historical") === "true";
const manual = params.get("manual") === "true";
const initial = supplierProduct(method).definition;
initial.title = "Mobile Legends · Regional diamond top-up";
initial.description =
  "Synthetic review product. Confirm your account region and player details before payment.";
initial.category = "Diamonds";
if (manual) delete initial.supplier;
initial.policy.delivery_min_hours =
  manual || historical ? 1 : method === "account" ? 24 : 0;
initial.policy.delivery_max_hours =
  manual || historical ? 24 : method === "account" ? 72 : 0;
initial.policy.reservation_minutes = 30;
initial.policy.delivery_terms = manual
  ? "PLAYORA staff fulfill this manual product within the accepted delivery estimate after payment and complete details."
  : "Our connected supplier fulfills this product after verified payment and complete required details. Follow the order status for confirmed delivery.";
initial.policy.refund_terms =
  "Accepted refund protections remain available if an agreed delivery condition is not met. Contact the support conversation for your order.";
initial.policy.fees =
  "The displayed price includes PLAYORA fulfillment charges. Your wallet may separately charge its network fee.";
const agreement: Commercial = {
  quote_id: "synthetic-delivery-quote",
  revision: 1,
  currency: "USD",
  subtotal_minor: "575",
  amount_minor: "575",
  lines: [],
  scope: initial.title,
  reason: initial.policy.delivery_terms,
  delivery_min_hours: initial.policy.delivery_min_hours,
  delivery_max_hours: initial.policy.delivery_max_hours,
  expires_at: "2099-01-01T00:00:00Z",
  terms_version: "synthetic-terms-v1",
  ...(!historical && !manual
    ? {
        delivery_basis:
          method === "account"
            ? "supplier_account_24_72_v1"
            : method === "code"
              ? "supplier_instant_code_v1"
              : "supplier_instant_id_v1",
      }
    : {}),
};
function Fixture() {
  const [value, change] = useState(initial);
  return (
    <MemoryRouter>
      <main className="page identity-page admin-order-workspace shop-editor">
        <h1>Delivery category review</h1>
        <p>
          Synthetic fixture · no purchase, publication or supplier connection
        </p>
        <section aria-label="Product terms" className="catalog-section">
          <h2>Product terms</h2>
          <fieldset className="admin-record-content">
            <legend>Product terms</legend>
            <ProductFields section="terms" value={value} change={change} />
          </fieldset>
        </section>
        <section aria-label="Product preview" className="catalog-section">
          <h2>Product preview</h2>
          <ProductPreview value={value} />
        </section>
        <section aria-label="Accepted agreement" className="catalog-section">
          <h2>Accepted agreement</h2>
          <Agreement data={agreement} />
        </section>
      </main>
    </MemoryRouter>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing synthetic fixture root");
createRoot(root).render(<Fixture />);
