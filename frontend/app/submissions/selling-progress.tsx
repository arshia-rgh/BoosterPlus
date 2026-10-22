import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { listingSchema } from "../resale/model";
import { Loading } from "../ui/loading";
import { z } from "../validation";
import "./selling-progress.css";

export const sellingProgressSchema = z.object({
  submission_state: z.string(),
  offer_state: z.string(),
  offer_id: z.string(),
  arrangement: z.string(),
  handover: z.object({
    state: z.string(),
    locked: z.boolean(),
    received_at: z.string().nullable(),
  }),
  listing_id: z.string(),
  listing_state: z.string(),
  payout_state: z.string(),
  blockers: z.array(z.string()),
});
export type SellingProgress = z.infer<typeof sellingProgressSchema>;
export function useSellingProgress(
  id: string,
  admin: boolean,
  revision: number,
) {
  const resource = useResource(
    `${admin ? "/admin" : ""}/submissions/${id}/selling-progress`,
    sellingProgressSchema,
  );
  const reload = resource.reload;
  const last = useRef(revision);
  useEffect(() => {
    if (last.current !== revision) {
      last.current = revision;
      reload();
    }
  }, [revision, reload]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  return resource;
}

export const publicationBlocker = (
  code: string,
  admin: boolean,
  payoutState = "",
): { label: string; section: string; actor: string } => {
  switch (code) {
    case "handover":
      return {
        label: "View requested information",
        section: "messages",
        actor: admin ? "Seller" : "You",
      };
    case "seller_payment":
      if (payoutState === "recipient_pending")
        return {
          label: admin
            ? "Seller to confirm payout destination"
            : "Confirm payout destination",
          section: "payout",
          actor: admin ? "Seller" : "You",
        };
      return {
        label: "Complete the agreed seller payout",
        section: "payout",
        actor: admin ? "Owner" : "PLAYORA",
      };
    case "listing":
      return {
        label: "Prepare the public listing",
        section: "listing",
        actor: admin ? "Admin" : "PLAYORA",
      };
    case "listing_details":
      return {
        label: "Complete listing details",
        section: "details",
        actor: admin ? "Admin" : "PLAYORA",
      };
    case "listing_price":
      return {
        label: "Check the listing price and commissions",
        section: "details",
        actor: admin ? "Admin" : "PLAYORA",
      };
    case "listing_images":
      return {
        label: "Review public images and choose a cover",
        section: "images",
        actor: admin ? "Admin" : "PLAYORA",
      };
    case "listing_terms":
      return {
        label: "Complete buyer terms and delivery timing",
        section: "terms",
        actor: admin ? "Admin" : "PLAYORA",
      };
    case "game_unavailable":
      return {
        label: "Enable account sales for this game",
        section: "catalog",
        actor: admin ? "Admin" : "PLAYORA",
      };
    default:
      return {
        label: "Preview and publish the saved listing",
        section: "publication",
        actor: admin ? "Admin" : "PLAYORA",
      };
  }
};

export function saleNextStep(
  p: SellingProgress,
  admin: boolean,
  owner: boolean,
) {
  const step = (
    title: string,
    body: string,
    section: string,
    label: string,
    actor: string,
    milestone: number,
  ) => ({ title, body, section, label, actor, milestone });
  if (["withdrawn", "rejected"].includes(p.submission_state))
    return step(
      "This account sale is closed",
      "Your agreement and messages remain available.",
      "messages",
      "View messages",
      admin ? "Admin" : "You",
      -1,
    );
  if (p.listing_state === "sold")
    return step(
      "Your account has sold",
      "Follow delivery and the payout timing in your accepted agreement.",
      "payout",
      "View payout",
      admin ? "Owner" : "PLAYORA",
      4,
    );
  if (p.listing_state === "reserved")
    return step(
      "A buyer is checking out",
      "The account is reserved while their payment is completed.",
      "agreement",
      "View sale agreement",
      "Buyer",
      3,
    );
  if (p.listing_state === "published")
    return step(
      "Live in Accounts",
      "The published listing is available for buyers.",
      "listing",
      "View listing",
      "Buyers",
      3,
    );
  if (p.listing_state === "unavailable")
    return step(
      "Listing paused with this game",
      "The listing is published, but account sales for this game are unavailable.",
      admin ? "catalog" : "messages",
      admin ? "Open game settings" : "Contact support",
      admin ? "Admin" : "PLAYORA",
      3,
    );
  if (["draft", "needs_information"].includes(p.submission_state))
    return step(
      p.submission_state === "draft"
        ? "Complete your account details"
        : "Update the requested details",
      admin
        ? "The seller needs to finish the details before review."
        : "Add the details and photos, then send the account for review.",
      "details",
      admin ? "View account details" : "Continue account details",
      admin ? "Seller" : "You",
      0,
    );
  if (p.submission_state === "submitted")
    return step(
      admin ? "Review this account" : "Your account is in review",
      admin
        ? "Check the details and leave the seller a clear decision."
        : "PLAYORA will review your details and send a proposal or request more information.",
      admin ? "details" : "messages",
      admin ? "Review account details" : "Message the team",
      admin ? "You" : "PLAYORA",
      0,
    );
  if (p.offer_state !== "accepted") {
    if (p.offer_state === "offered")
      return step(
        admin ? "Waiting for the seller" : "Review your sale proposal",
        admin
          ? "The seller must accept the exact amount and terms."
          : "Check your net payout and payment timing before accepting.",
        "agreement",
        "Review sale proposal",
        admin ? "Seller" : "You",
        1,
      );
    return step(
      p.offer_state === "expired"
        ? "The proposal has expired"
        : admin
          ? "Prepare a sale proposal"
          : "Your account review is approved",
      admin
        ? "Set the exact seller amount, payout route and terms."
        : "PLAYORA will send the exact payout and terms for you to accept.",
      "agreement",
      admin ? "Prepare sale proposal" : "View sale agreement",
      admin ? "You" : "PLAYORA",
      1,
    );
  }
  if (admin && !p.listing_id)
    return step(
      "Prepare the public listing",
      "The seller accepted the proposal. Create the listing while any remaining prerequisites are completed.",
      "listing",
      "Prepare listing",
      "You",
      2,
    );
  if (
    admin &&
    p.blockers.includes("seller_payment") &&
    p.payout_state === "recipient_pending"
  )
    return step(
      "Waiting for the seller's payout destination",
      "The seller needs to confirm where to receive the agreed crypto payout.",
      "payout",
      "View seller payout",
      "Seller",
      2,
    );
  if (
    !admin &&
    p.blockers.includes("seller_payment") &&
    p.payout_state === "recipient_pending"
  )
    return step(
      "Confirm your payout destination",
      "Add and confirm your crypto address in Payout. PLAYORA can then complete the agreed buy-first payment before publishing.",
      "payout",
      "Confirm payout destination",
      "You",
      2,
    );
  if (admin && p.blockers.includes("seller_payment"))
    return step(
      "Seller payout is needed before publication",
      owner
        ? "Follow the agreed payout conditions and record the completed transfer."
        : "The owner must complete and record the agreed seller payout.",
      "payout",
      "View seller payout",
      owner ? "You" : "Owner",
      2,
    );
  return step(
    admin
      ? "Finish and publish the listing"
      : p.listing_state === "withdrawn"
        ? "Your listing is paused"
        : "PLAYORA is preparing your listing",
    admin
      ? "Complete the items below, preview the saved listing and publish."
      : "Your agreement is accepted. PLAYORA is completing the listing checks below.",
    admin ? "listing" : "messages",
    admin ? "Continue listing" : "Message the team",
    admin ? "You" : "PLAYORA",
    2,
  );
}

export function PrepareListing({
  offerID,
  submissionID,
}: {
  offerID: string;
  submissionID: string;
}) {
  const location: Location<unknown> = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    lock = useRef(false),
    navigate = useNavigate();
  async function open() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const row = await post(
        `/admin/seller-offers/${offerID}/listing`,
        {},
        listingSchema,
      );
      void navigate(`/admin/accounts/${row.id}?section=details`, {
        state: {
          ...(typeof location.state === "object" && location.state !== null
            ? location.state
            : {}),
          submissionID,
          submissionSection:
            new URLSearchParams(location.search).get("section") ?? "overview",
        },
      });
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <ErrorNotice error={error} />
      <Action disabled={busy} onClick={() => void open()}>
        Prepare listing
      </Action>
    </div>
  );
}

export function SaleProgress({
  id,
  admin,
  owner,
  resource,
}: {
  id: string;
  admin: boolean;
  owner: boolean;
  resource: ReturnType<typeof useSellingProgress>;
}) {
  const location: Location<unknown> = useLocation();
  const listingContext = {
    ...(typeof location.state === "object" && location.state !== null
      ? location.state
      : {}),
    submissionID: id,
    submissionSection: "overview",
  };
  if (resource.error)
    return (
      <section className="sale-progress sale-progress-error">
        <h3>Sale progress unavailable</h3>
        <ErrorNotice
          error={resource.error}
          message="We could not check the next step. Your saved account details are unchanged."
        />
        <Action onClick={resource.reload}>Retry sale progress</Action>
      </section>
    );
  if (!resource.data)
    return <Loading compact label="Loading account sale progress" />;
  const p = resource.data,
    next = saleNextStep(p, admin, owner);
  const destination = (section: string) =>
    section === "listing"
      ? admin
        ? `/admin/accounts/${p.listing_id}?section=details`
        : `/accounts/${p.listing_id}`
      : section === "catalog"
        ? "/admin/catalog"
        : `?section=${section}`;
  const blockers = [...new Set(p.blockers)].filter(
    (code) => code !== "handover",
  );
  return (
    <section
      className="sale-progress"
      aria-label="Account sale progress"
      aria-busy={resource.loading}
    >
      {next.milestone >= 0 && (
        <ol className="sale-milestones" aria-label="Sale stages">
          {[
            "Account review",
            "Sale agreement",
            "Prepare listing",
            "Live for sale",
          ].map((label, index) => (
            <li
              key={label}
              aria-current={
                index === Math.min(next.milestone, 3) ? "step" : undefined
              }
              data-complete={index < next.milestone}
            >
              <span aria-hidden="true">
                {index < next.milestone ? "✓" : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      <div className="sale-next">
        <p className="eyebrow">Next step · {next.actor}</p>
        <h3>{next.title}</h3>
        <p>{next.body}</p>
        {next.section === "listing" && admin && !p.listing_id ? (
          <PrepareListing offerID={p.offer_id} submissionID={id} />
        ) : (
          <Link
            className="button compact"
            to={destination(next.section)}
            state={next.section === "listing" ? listingContext : location.state}
            preventScrollReset
          >
            {next.label}
          </Link>
        )}
      </div>
      {p.offer_state === "accepted" && blockers.length > 0 && (
        <div className="sale-blockers">
          <h4>Before this account can go live</h4>
          <ul>
            {blockers.map((code) => {
              const item = publicationBlocker(code, admin, p.payout_state);
              const listingSection =
                code.startsWith("listing_") || code === "publication";
              const href = listingSection
                ? `/admin/accounts/${p.listing_id}?section=${item.section}`
                : destination(item.section);
              const actionable =
                code === "handover"
                  ? !admin
                  : code === "seller_payment" &&
                      p.payout_state === "recipient_pending" &&
                      !admin
                    ? true
                    : admin &&
                      code !== "listing" &&
                      (code !== "seller_payment" || owner);
              return (
                <li key={code}>
                  <span>
                    {actionable ? (
                      <Link
                        to={href}
                        state={listingSection ? listingContext : location.state}
                        preventScrollReset
                      >
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </span>
                  <small>{item.actor}</small>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        type="button"
        className="sale-refresh"
        disabled={resource.loading}
        onClick={resource.reload}
      >
        Refresh sale progress
      </button>
    </section>
  );
}

/** Readiness facts from seller selling progress or, for PLAYORA-created listings, the listing itself. */
export type ReadinessResource = {
  data: {
    blockers: string[];
    payout_state?: string | undefined;
    listing_id?: string | undefined;
    listing_state?: string | undefined;
  } | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
};
export function ListingReadiness({
  resource,
  submissionID,
  dirty,
  reviewed,
  preview,
  owned = false,
}: {
  resource: ReadinessResource;
  submissionID: string;
  dirty: boolean;
  reviewed: boolean;
  preview: boolean;
  /** PLAYORA-created listings upload their own images. */
  owned?: boolean;
}) {
  const location: Location<unknown> = useLocation();
  if (resource.error)
    return (
      <section className="sale-progress sale-progress-error">
        <h3>Publication status unavailable</h3>
        <ErrorNotice error={resource.error} />
        <Action onClick={resource.reload}>Retry publication status</Action>
      </section>
    );
  if (!resource.data)
    return <Loading compact label="Checking publication requirements" />;
  const external = [...new Set(resource.data.blockers)].filter(
    (code) => code !== "publication" && code !== "listing",
  );
  return (
    <section className="sale-progress" aria-label="Publication requirements">
      <div className="sale-blockers">
        <h3>Before publishing</h3>
        <ul>
          {external.map((code) => {
            const b = publicationBlocker(
              code,
              true,
              resource.data?.payout_state,
            );
            return (
              <li key={code}>
                <Link
                  state={
                    code.startsWith("listing_")
                      ? location.state
                      : {
                          ...(typeof location.state === "object" &&
                          location.state !== null
                            ? location.state
                            : {}),
                          inventoryID: resource.data?.listing_id,
                          inventorySection: "publication",
                        }
                  }
                  preventScrollReset
                  to={
                    code.startsWith("listing_")
                      ? `?section=${b.section}`
                      : code === "game_unavailable"
                        ? "/admin/catalog"
                        : `/admin/submissions/${submissionID}?section=${b.section}`
                  }
                >
                  {owned && code === "listing_images"
                    ? "Add account images and choose a cover"
                    : b.label}
                </Link>
                <small>
                  {dirty && code.startsWith("listing_")
                    ? "Saved draft"
                    : b.actor}
                </small>
              </li>
            );
          })}
          <li>
            <span>
              {dirty ? "Save your listing changes" : "Listing changes saved"}
            </span>
            <small>{dirty ? "To do" : "Done"}</small>
          </li>
          <li>
            <span>Preview the saved listing</span>
            <small>{preview && !dirty ? "Done" : "To do"}</small>
          </li>
          <li>
            <span>Confirm the public content and images</span>
            <small>{reviewed && !dirty ? "Done" : "To do"}</small>
          </li>
        </ul>
        {external.length === 0 && !dirty && preview && reviewed && (
          <p>Ready for your final publication check.</p>
        )}
        <p>
          Only published listings appear in Accounts. Saving a draft keeps it
          private.
        </p>
      </div>
    </section>
  );
}
