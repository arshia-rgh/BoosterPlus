import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { get, post } from "../identity/api";
import { draftSchema } from "../shop/model";
import type { Connection, Offer, Product } from "./model";

export function PrepareListing({
  connection,
  importID,
  product,
  offer,
  disabled,
}: {
  connection: Connection;
  importID: string;
  product: Product;
  offer: Offer;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false),
    navigate = useNavigate();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const linked = offer.pricing.shop_product_id;
  return (
    <div>
      <ErrorNotice error={error} />
      {linked && (
        <Link
          className="ui-button"
          data-variant="secondary"
          to={`/admin/shop/${linked}`}
        >
          Open listing draft
        </Link>
      )}
      <Action
        disabled={
          disabled ||
          busy ||
          !connection.configured ||
          !importID ||
          offer.pricing.version < 1 ||
          offer.pricing.issues.length > 0 ||
          product.review_issues.length > 0
        }
        onClick={() => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError(null);
          void (async () => {
            const current = linked
              ? await get(`/admin/shop/products/${linked}`, draftSchema)
              : null;
            if (!alive.current) return;
            return post(
              "/admin/shop/supplier-listings",
              {
                connection: connection.id,
                import_id: importID,
                product_id: product.id,
                offer_id: offer.id,
                price_version: offer.pricing.version,
                connection_version: connection.version,
                shop_version: current?.version ?? 0,
              },
              draftSchema,
            );
          })()
            .then(async (draft) => {
              if (draft && alive.current)
                await navigate(`/admin/shop/${draft.id}`);
            })
            .catch((cause: unknown) => {
              if (alive.current) setError(cause);
            })
            .finally(() => {
              lock.current = false;
              if (alive.current) setBusy(false);
            });
        }}
      >
        {linked
          ? "Refresh draft from supplier settings"
          : "Prepare listing draft"}
      </Action>
    </div>
  );
}
