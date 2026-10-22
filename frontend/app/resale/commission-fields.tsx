import { useState } from "react";
import { Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import {
  buyerCommission,
  sellerCommission,
  type BuyerCommission,
  type SellerCommission,
} from "./commissions";
import { maximumDisplay, maximumMinor } from "./market-price";

export function BuyerBreakdown({ price }: { price: BuyerCommission }) {
  return (
    <dl
      className="account-price-breakdown"
      aria-label="Account price breakdown"
    >
      <div>
        <dt>Account price</dt>
        <dd>USD {minorDisplay(price.base_minor)}</dd>
      </div>
      <div>
        <dt>Buyer commission (5%)</dt>
        <dd>USD {minorDisplay(price.fee_minor)}</dd>
      </div>
      <div>
        <dt>Total to pay</dt>
        <dd>
          <strong>USD {minorDisplay(price.total_minor)}</strong>
        </dd>
      </div>
    </dl>
  );
}

export function SellerBreakdown({
  price,
  asset,
}: {
  price: SellerCommission;
  asset: string;
}) {
  return (
    <section aria-label="Seller price breakdown">
      <dl className="account-price-breakdown">
        <div>
          <dt>Account base price</dt>
          <dd>USD {minorDisplay(price.base_minor)}</dd>
        </div>
        <div>
          <dt>Seller commission (10%)</dt>
          <dd>− USD {minorDisplay(price.fee_minor)}</dd>
        </div>
        <div>
          <dt>Your net proceeds</dt>
          <dd>USD {minorDisplay(price.net_minor)}</dd>
        </div>
        <div>
          <dt>Exact crypto you receive</dt>
          <dd>
            <strong>
              {price.net_amount} {asset.toUpperCase()}
            </strong>
          </dd>
        </div>
      </dl>
      <p>
        Conversion: {price.rate} {asset.toUpperCase()} per USD. Source:{" "}
        {price.rate_source}. Quoted {new Date(price.quoted_at).toLocaleString()}
        .
      </p>
      <p>
        Crypto is rounded upward to six decimal places. PLAYORA pays outgoing
        fees; your accepted net stays fixed.
      </p>
    </section>
  );
}

export function BuyerPriceInput({
  price,
  change,
  consignment = true,
}: {
  price: BuyerCommission | undefined;
  change: (price: BuyerCommission) => void;
  /** Only consignment bases are fixed by an accepted seller agreement. */
  consignment?: boolean;
}) {
  const [base, setBase] = useState(maximumDisplay(price?.base_minor ?? ""));
  return (
    <>
      <Text
        name="product.commission.base_minor"
        label="Account base price (USD)"
        value={base}
        help={
          consignment
            ? "Enter dollars, for example 100.00. The buyer pays 5% more. A consignment base must match the accepted seller agreement."
            : "Enter dollars, for example 100.00. The buyer pays 5% more."
        }
        change={(value) => {
          setBase(value);
          const minor = maximumMinor(value) ?? "";
          change(
            buyerCommission(minor) ?? {
              version: "account_commission_v1",
              base_minor: minor,
              fee_minor: "",
              total_minor: "",
            },
          );
        }}
      />
      {price && buyerCommission(price.base_minor) && (
        <BuyerBreakdown price={price} />
      )}
    </>
  );
}

export function SellerPriceInput({
  price,
  asset,
  change,
}: {
  price: SellerCommission | undefined;
  asset: string;
  change: (price: SellerCommission) => void;
}) {
  const [base, setBase] = useState(maximumDisplay(price?.base_minor ?? ""));
  const [rate, setRate] = useState(price?.rate ?? "");
  const [source, setSource] = useState(price?.rate_source ?? "");
  const [quoted, setQuoted] = useState("");
  function update(b: string, r: string, s: string, at: string) {
    const minor = maximumMinor(b) ?? "";
    change(
      sellerCommission(minor, r, s, at) ?? {
        version: "account_commission_v1",
        base_minor: minor,
        rate: r,
        rate_source: s,
        quoted_at: at,
        fee_minor: "",
        net_minor: "",
        net_amount: "",
      },
    );
  }
  return (
    <fieldset className="account-commission-editor">
      <legend>Seller price and conversion quote</legend>
      <Text
        name="terms.commission.base_minor"
        label="Agreed account base price (USD)"
        value={base}
        help="Enter dollars, for example 100.00. The seller receives the base minus 10%."
        change={(v) => {
          setBase(v);
          update(v, rate, source, quoted);
        }}
      />
      <Text
        name="terms.commission.rate"
        label="Crypto units per USD"
        value={rate}
        help="Use the actual quote for the selected payout asset; do not assume USDT equals USD."
        change={(v) => {
          setRate(v);
          update(base, v, source, quoted);
        }}
      />
      <Text
        name="terms.commission.rate_source"
        label="Conversion quote source"
        value={source}
        help="Name the provider and quote reference, without credentials."
        change={(v) => {
          setSource(v);
          update(base, rate, v, quoted);
        }}
      />
      <Text
        name="terms.commission.quoted_at"
        label="Conversion quote time"
        type="datetime-local"
        value={quoted}
        help="Use a quote from the past 24 hours. Time is shown in your local timezone."
        change={(v) => {
          setQuoted(v);
          update(base, rate, source, v);
        }}
      />
      {price?.net_amount && <SellerBreakdown price={price} asset={asset} />}
    </fieldset>
  );
}
