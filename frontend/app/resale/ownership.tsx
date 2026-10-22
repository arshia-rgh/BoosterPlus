import { useEffect, useRef, useState } from "react";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema as gamesSchema } from "../catalog/model";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { useBlocker, useNavigate } from "../portal-router";
import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import { listingSchema, type Listing, type Origin } from "./model";
import "./ownership.css";

// Ownership is derived from the immutable origin: PLAYORA owns staff-created
// and bought-first accounts; consignment accounts stay the seller's.
export const ownershipLabel = (ownership: Listing["ownership"]) =>
  ownership === "playora" ? "PLAYORA-owned" : "Seller consignment";
export const sourceLabel = (origin: Origin) =>
  origin === "playora"
    ? "Created by staff"
    : origin === "buy_first"
      ? "Bought from seller"
      : "Listed for a seller";
/** The rule that applies when the account sells, never a status the list cannot prove. */
export const saleOutcome = (origin: Origin) =>
  origin === "playora"
    ? "No seller payout."
    : origin === "buy_first"
      ? "No seller payout. The seller is paid before publication."
      : "The seller is paid after the buyer's delivery and inspection.";

export function OwnershipChip({ row }: { row: Listing }) {
  return (
    <span className="ownership-chip" data-ownership={row.ownership}>
      {ownershipLabel(row.ownership)}
    </span>
  );
}

export function OwnershipPanel({ row }: { row: Listing }) {
  return (
    <dl className="ownership-panel">
      <div>
        <dt>Ownership</dt>
        <dd>
          <OwnershipChip row={row} /> <span>{sourceLabel(row.origin)}</span>
        </dd>
      </div>
      <div>
        <dt>When it sells</dt>
        <dd>
          {saleOutcome(row.origin)}
          {row.origin === "buy_first" &&
            row.seller_payout_confirmed === false &&
            " The seller payout is not confirmed yet, so this account can't be published."}
        </dd>
      </div>
    </dl>
  );
}

export function CreatePlayoraListing({
  search,
  close,
}: {
  search: string;
  close: () => void;
}) {
  const [after, setAfter] = useState(""),
    [game, setGame] = useState(""),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [uncertain, setUncertain] = useState(false),
    [cancel, setCancel] = useState(false);
  const games = useResource(
    `/admin/catalog/games?after=${encodeURIComponent(after)}`,
    gamesSchema,
  );
  const navigate = useNavigate();
  const lock = useRef(false),
    committed = useRef(false),
    // One request key per panel: a retry after an uncertain result returns the
    // same draft instead of creating a second one.
    requestKey = useRef(crypto.randomUUID()),
    prompt = useRef<HTMLElement>(null),
    heading = useRef<HTMLLegendElement>(null),
    first = useRef<HTMLDivElement>(null);
  const dirty = !!game || !!title;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !committed.current &&
      (dirty || busy) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const focused = useRef(false);
  useEffect(() => {
    // The game list is disabled until its choices load; move there once ready
    // unless the user has already moved on from the panel heading.
    if (focused.current || !games.data) return;
    focused.current = true;
    if (document.activeElement === heading.current)
      first.current?.querySelector<HTMLSelectElement>("select")?.focus();
  }, [games.data]);
  useEffect(() => {
    if (cancel || blocker.state === "blocked") prompt.current?.focus();
  }, [cancel, blocker.state]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      if (!committed.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy]);
  async function create() {
    if (lock.current || games.loading || games.error) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setUncertain(false);
    try {
      rejectInvalidFields([
        ...(game ? [] : [{ path: "game_id", message: "Choose a game." }]),
        ...(title.trim() && title.length <= 120
          ? []
          : [{ path: "title", message: "Enter a title of 1–120 characters." }]),
      ]);
      const row = await post(
        "/admin/account-listings",
        { request_key: requestKey.current, game_id: game, title },
        listingSchema,
      );
      committed.current = true;
      await navigate(`/admin/accounts/${row.id}?section=details`, {
        state: { inventorySearch: search },
      });
    } catch (cause) {
      setError(cause);
      // A network failure or timeout leaves the result unknown; keep the key.
      setUncertain(!(cause instanceof APIError) || cause.status >= 500);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const options = games.data?.games.filter(
    (row) => !row.archived && row.published,
  );
  return (
    <ActionFields error={error} busy={busy}>
      <form
        className="ownership-new"
        aria-label="New PLAYORA-owned listing"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        {(cancel || blocker.state === "blocked") && (
          <section role="alert" ref={prompt} tabIndex={-1}>
            <h3>Discard this new listing?</h3>
            <p>The game and title have not been saved.</p>
            <div className="catalog-actions">
              <Action
                onClick={() => {
                  setCancel(false);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Keep new listing
              </Action>
              <Action
                disabled={busy}
                onClick={() => {
                  if (blocker.state === "blocked") blocker.proceed();
                  else close();
                }}
              >
                Discard new listing
              </Action>
            </div>
          </section>
        )}
        <fieldset disabled={busy}>
          <legend tabIndex={-1} ref={heading}>
            New PLAYORA-owned listing
          </legend>
          <p>
            PLAYORA must own this account. The draft stays private until you
            publish it.
          </p>
          <ErrorNotice error={games.error} />
          {!!games.error && (
            <Action onClick={games.reload}>Retry game choices</Action>
          )}
          <div ref={first} className="ownership-new-fields">
            <Select
              name="game_id"
              label="Game (required)"
              value={game}
              change={setGame}
              // An uncertain create may already exist for this game; keep it
              // fixed so the retry reuses the same request.
              disabled={games.loading || !!games.error || uncertain}
              options={[
                ["", "Choose game"],
                ...(options?.map(
                  (row) =>
                    [
                      row.id,
                      row.paused ? `${row.name} (account sales off)` : row.name,
                    ] as const,
                ) ?? []),
              ]}
            />
            <Text
              name="title"
              label="Public account title (required)"
              value={title}
              change={setTitle}
            />
          </div>
          {(!!games.data?.next || after) && (
            <div className="catalog-actions">
              {!!games.data?.next && (
                <Action
                  onClick={() => {
                    setAfter(games.data?.next ?? "");
                    setGame("");
                  }}
                >
                  More games
                </Action>
              )}
              {after && (
                <Action
                  onClick={() => {
                    setAfter("");
                    setGame("");
                  }}
                >
                  First games
                </Action>
              )}
            </div>
          )}
          {uncertain && !!error ? (
            <p role="alert" className="ownership-warning">
              We couldn&apos;t confirm the draft was created. Try again; the
              same request won&apos;t create a second draft. To choose another
              game, cancel and start a new listing.
            </p>
          ) : (
            <ErrorNotice error={error} hideIssues />
          )}
          <div className="catalog-actions">
            <button type="submit" className="button compact">
              {busy ? "Creating draft…" : "Create private draft"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                if (dirty) setCancel(true);
                else close();
              }}
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </ActionFields>
  );
}
