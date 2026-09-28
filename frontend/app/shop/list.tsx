import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema } from "../catalog/model";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  draftSchema,
  emptyDefinition,
  productsSchema,
  productStates,
} from "./model";
import "./shop.css";
export function ShopProducts() {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("q") ?? "");
  const query = new URLSearchParams();
  for (const key of ["q", "state", "game", "availability", "after"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const resource = useResource(
    `/admin/shop/products?${query.toString()}`,
    productsSchema,
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(query);
    next.delete("after");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  return (
    <div className="shop-editor">
      <p>
        Manage game items delivered manually by PLAYORA staff. A draft is
        private; publication and stock are separate reviewed steps.
      </p>
      <CreateProduct search={query.toString()} />
      <section aria-label="Find shop products">
        <Link className="button" to="/admin/shop/orders">
          Shop delivery queue
        </Link>
        <h2>Products</h2>
        <GameFilter
          selected={params.get("game") ?? ""}
          change={(value) => {
            update("game", value);
          }}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            update("q", search);
          }}
        >
          <Text
            label="Search products by title or reference"
            value={search}
            change={setSearch}
          />
          <button className="button compact" type="submit">
            Search products
          </button>
        </form>
        <Select
          label="Product state"
          value={params.get("state") ?? ""}
          options={productStates}
          change={(value) => {
            update("state", value);
          }}
        />
        <Select
          label="Purchase availability"
          value={params.get("availability") ?? ""}
          options={[
            ["", "Any availability"],
            ["available", "Available for new orders"],
            ["unavailable", "Unavailable for new orders"],
          ]}
          change={(value) => {
            update("availability", value);
          }}
        />
        <p className="quiet">
          Availability checks the published product and variant, remaining stock
          for its minimum quantity, and the game’s current Shop service. Paused,
          unpublished or exhausted products are unavailable for new orders.
        </p>
        {params.get("game") && (
          <Action
            onClick={() => {
              update("game", "");
            }}
          >
            Show all games
          </Action>
        )}
        <ErrorNotice error={resource.error} />
        {!!resource.error && (
          <Action disabled={resource.loading} onClick={resource.reload}>
            Retry products
          </Action>
        )}
        {resource.loading && <p role="status">Loading products…</p>}
        {resource.data?.items.length === 0 && (
          <p>
            {query.toString()
              ? "No products match these filters. Change your search or choose another game, state or purchase availability."
              : "No products yet. Create your first private draft above."}
          </p>
        )}
        <ul className="shop-list">
          {resource.data?.items.map((row) => (
            <li key={row.id}>
              <h3>{row.title || "Untitled product"}</h3>
              <p>
                {row.game} · {row.state} · Revision {row.version}
              </p>
              <Link
                className="button compact"
                to={`/admin/shop/${row.id}`}
                state={{ shopSearch: query.toString() }}
              >
                Edit {row.title || "untitled product"}
              </Link>
            </li>
          ))}
        </ul>
        {!!resource.data?.next && (
          <Action
            disabled={resource.loading}
            onClick={() => {
              const next = new URLSearchParams(query);
              next.set("after", resource.data?.next ?? "");
              setParams(next);
            }}
          >
            Next products
          </Action>
        )}
        {params.get("after") && (
          <Action
            onClick={() => {
              const next = new URLSearchParams(query);
              next.delete("after");
              setParams(next);
            }}
          >
            First products
          </Action>
        )}
      </section>
    </div>
  );
}
function CreateProduct({ search }: { search: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h2>Create a product</h2>
      <p>
        Choose an existing game, then define its delivery details and variants.
      </p>
      <Action
        disabled={open}
        onClick={() => {
          setOpen(true);
        }}
      >
        New product draft
      </Action>
      {open && (
        <CreateForm
          search={search}
          close={() => {
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
function CreateForm({ search, close }: { search: string; close: () => void }) {
  const [after, setAfter] = useState(""),
    [game, setGame] = useState(""),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const resource = useResource(
      `/admin/catalog/games?after=${encodeURIComponent(after)}`,
      listingSchema,
    ),
    navigate = useNavigate(),
    lock = useRef(false);
  const committed = useRef(false),
    prompt = useRef<HTMLElement>(null);
  const [cancel, setCancel] = useState(false);
  const dirty = !!game || !!title;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !committed.current &&
      (dirty || busy) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
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
    if (
      !game ||
      !title.trim() ||
      lock.current ||
      resource.loading ||
      resource.error
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const row = await post(
        "/admin/shop/products",
        { game_id: game, definition: { ...emptyDefinition(), title } },
        draftSchema,
      );
      committed.current = true;
      await navigate(`/admin/shop/${row.id}`, {
        state: { shopSearch: search },
      });
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      {(cancel || blocker.state === "blocked") && (
        <section role="alert" ref={prompt} tabIndex={-1}>
          <h3>Discard this new product?</h3>
          <p>The game choice and title have not been saved.</p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                setCancel(false);
                if (blocker.state === "blocked") blocker.reset();
              }}
            >
              Keep new product
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                if (blocker.state === "blocked") blocker.proceed();
                else close();
              }}
            >
              Discard new product
            </Action>
          </div>
        </section>
      )}
      <Action
        disabled={busy}
        onClick={() => {
          if (dirty) setCancel(true);
          else close();
        }}
      >
        Cancel new product
      </Action>
      <ErrorNotice error={resource.error ?? error} />
      {!!resource.error && (
        <Action onClick={resource.reload}>Retry game choices</Action>
      )}
      <fieldset disabled={busy || resource.loading || !!resource.error}>
        <legend>New private draft</legend>
        <Select
          label="Product game"
          value={game}
          change={setGame}
          options={[
            ["", "Choose game"],
            ...(resource.data?.games
              .filter((row) => !row.archived)
              .map((row) => [row.id, row.name] as const) ?? []),
          ]}
        />
        {!!resource.data?.next && (
          <Action
            onClick={() => {
              setAfter(resource.data?.next ?? "");
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
        <Text label="New product title" value={title} change={setTitle} />
        <button
          type="submit"
          className="button compact"
          disabled={!game || !title.trim()}
        >
          {busy ? "Creating draft…" : "Create product draft"}
        </button>
      </fieldset>
    </form>
  );
}

function GameFilter({
  selected,
  change,
}: {
  selected: string;
  change: (value: string) => void;
}) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/admin/catalog/games?after=${encodeURIComponent(after)}`,
    listingSchema,
  );
  const current = resource.data?.games.some((game) => game.id === selected);
  return (
    <fieldset className="catalog-item">
      <legend>Filter by game</legend>
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action onClick={resource.reload}>Retry game filters</Action>
      )}
      <Select
        label="Game filter"
        value={selected}
        change={change}
        disabled={resource.loading || !!resource.error}
        options={[
          ["", "All games"],
          ...(selected && !current
            ? [[selected, "Selected game from another page"] as const]
            : []),
          ...(resource.data?.games.map(
            (game) => [game.id, game.name] as const,
          ) ?? []),
        ]}
      />
      {!!resource.data?.next && (
        <Action
          disabled={resource.loading}
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          More filter games
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First filter games
        </Action>
      )}
    </fieldset>
  );
}
