import { useEffect, useState } from "react";
import { useBlocker } from "react-router";
import { z } from "../validation";
import { get, post } from "../identity/api";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "./controls";

const strings = z
  .array(z.string())
  .nullable()
  .transform((v) => v ?? []);
export const couponDefinitionSchema = z.object({
  code: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  kind: z.string(),
  value: z.string(),
  currency: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  minimum_subtotal: z.string(),
  maximum_discount: z.string(),
  global_limit: z.number().int(),
  customer_limit: z.number().int(),
  games: strings,
  services: strings,
  packages: strings,
  categories: strings,
});
export const couponSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  definition: couponDefinitionSchema,
});
export const couponsSchema = z.object({
  coupons: z.array(couponSchema),
  next: z.string(),
});
const historySchema = z.object({ coupons: z.array(couponSchema) });
type Definition = z.infer<typeof couponDefinitionSchema>;
type Coupon = z.infer<typeof couponSchema>;
function emptyCoupon(): Coupon {
  return {
    id: "",
    version: 0,
    definition: {
      code: "",
      name: "",
      enabled: false,
      kind: "percentage",
      value: "",
      currency: "",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      minimum_subtotal: "0",
      maximum_discount: "",
      global_limit: 0,
      customer_limit: 1,
      games: [],
      services: [],
      packages: [],
      categories: ["boosting"],
    },
  };
}
function split(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function CSV({
  label,
  values,
  change,
  help,
}: {
  label: string;
  values: string[];
  change: (values: string[]) => void;
  help: string;
}) {
  const [raw, setRaw] = useState(values.join(","));
  return (
    <Text
      label={label}
      value={raw}
      change={(text) => {
        setRaw(text);
        change(split(text));
      }}
      help={help}
    />
  );
}

export default function Coupons() {
  const [items, setItems] = useState<Coupon[]>([]),
    [next, setNext] = useState(""),
    [selected, setSelected] = useState<Coupon | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    [history, setHistory] = useState<Coupon[]>([]);
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    let active = true;
    void get("/admin/catalog/coupons", couponsSchema)
      .then((result) => {
        if (active) {
          setItems(result.coupons);
          setNext(result.next);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy]);
  const update = (patch: Partial<Definition>) => {
    if (selected) {
      setSelected({
        ...selected,
        definition: { ...selected.definition, ...patch },
      });
      setDirty(true);
      setNotice("");
    }
  };
  async function save() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        selected.id
          ? `/admin/catalog/coupons/${selected.id}/save`
          : "/admin/catalog/coupons",
        { version: selected.version, definition: selected.definition },
        couponSchema,
      );
      setSelected(result);
      setDirty(false);
      setHistory([]);
      setItems((current) => [
        result,
        ...current.filter((c) => c.id !== result.id),
      ]);
      setNotice("Coupon saved.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory(before?: number) {
    if (!selected?.id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await get(
        `/admin/catalog/coupons/${selected.id}/history${before ? `?before=${String(before)}` : ""}`,
        historySchema,
      );
      setHistory(result.coupons);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    setBusy(true);
    setError(null);
    try {
      const result = await get(
        `/admin/catalog/coupons?after=${encodeURIComponent(next)}`,
        couponsSchema,
      );
      setItems((current) => [
        ...current,
        ...result.coupons.filter(
          (c) => !current.some((existing) => existing.id === c.id),
        ),
      ]);
      setNext(result.next);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  const c = selected?.definition;
  return (
    <section>
      <h2>Coupon policies</h2>
      <p>
        One code per order. Checks are provisional until a payable order
        reserves its use. Discounts never create a wallet balance.
      </p>
      <ErrorNotice error={error} />
      {notice && <p role="status">{notice}</p>}
      {blocker.state === "blocked" && (
        <div role="alert">
          <p>Leave this page and discard unsaved coupon changes?</p>
          <Action
            disabled={busy}
            onClick={() => {
              blocker.proceed();
            }}
          >
            Discard and leave
          </Action>
          <Action
            onClick={() => {
              blocker.reset();
            }}
          >
            Keep editing
          </Action>
        </div>
      )}
      <fieldset disabled={busy || dirty}>
        <legend>Manage coupons</legend>
        <Action
          onClick={() => {
            setSelected(emptyCoupon());
            setDirty(true);
            setHistory([]);
            setError(null);
            setNotice("");
          }}
        >
          New coupon
        </Action>
        {items.length === 0 && <p>No coupons have been configured.</p>}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Action
                onClick={() => {
                  setSelected(item);
                  setHistory([]);
                  setError(null);
                  setNotice("");
                }}
              >
                Edit {item.definition.code}
              </Action>{" "}
              · {item.definition.enabled ? "Enabled" : "Disabled"} · revision{" "}
              {item.version}
            </li>
          ))}
        </ul>
        {next && <Action onClick={() => void more()}>More coupons</Action>}
      </fieldset>
      {selected && c && (
        <section>
          <h3>{selected.id ? `Edit ${c.code}` : "Create coupon"}</h3>
          <fieldset disabled={busy}>
            <legend>Coupon definition</legend>
            {selected.id ? (
              <p>Permanent code: {c.code}</p>
            ) : (
              <Text
                label="Coupon code"
                value={c.code}
                change={(code) => {
                  update({ code: code.toUpperCase() });
                }}
                help="3–40 uppercase letters, digits, underscores or hyphens. Codes cannot be renamed or reused."
              />
            )}
            <Text
              label="Coupon name"
              value={c.name}
              change={(name) => {
                update({ name });
              }}
            />
            <Check
              label="Enable coupon"
              value={c.enabled}
              change={(enabled) => {
                update({ enabled });
              }}
            />
            <Select
              label="Discount kind"
              value={c.kind}
              change={(kind) => {
                update({ kind });
              }}
              options={[
                ["percentage", "Percentage"],
                ["fixed", "Fixed minor-unit amount"],
              ]}
            />
            <Text
              label="Discount value"
              value={c.value}
              change={(value) => {
                update({ value });
              }}
              help={
                c.kind === "percentage"
                  ? "Above zero, at most 100 percent."
                  : "Positive whole minor units."
              }
            />
            <Select
              label="Coupon currency"
              value={c.currency}
              change={(currency) => {
                update({ currency });
              }}
              options={[
                ["", "Select currency"],
                ["USD", "USD"],
                ["EUR", "EUR"],
                ["GBP", "GBP"],
              ]}
            />
            <Text
              label="Starts at"
              value={c.starts_at}
              change={(starts_at) => {
                update({ starts_at });
              }}
              help="ISO timestamp with explicit timezone, for example 2026-09-10T00:00:00Z."
            />
            <Text
              label="Ends at"
              value={c.ends_at}
              change={(ends_at) => {
                update({ ends_at });
              }}
              help="The end instant is exclusive. Enter an ISO timestamp with a timezone."
            />
            <Text
              label="Minimum subtotal in minor units"
              value={c.minimum_subtotal}
              change={(minimum_subtotal) => {
                update({ minimum_subtotal });
              }}
            />
            <Text
              label="Maximum discount in minor units"
              value={c.maximum_discount}
              change={(maximum_discount) => {
                update({ maximum_discount });
              }}
              help="Leave empty for no additional cap. At least one minor unit remains payable."
            />
            <NumberInput
              label="Global usage limit"
              value={c.global_limit}
              change={(global_limit) => {
                update({ global_limit });
              }}
            />
            <NumberInput
              label="Per-customer usage limit"
              value={c.customer_limit}
              change={(customer_limit) => {
                update({ customer_limit });
              }}
            />
            <p>
              Zero means unlimited. Held and redeemed uses count across every
              revision; editing or refunding a coupon does not reset its usage.
            </p>
            <CSV
              key={`${selected.id}:${String(selected.version)}:games`}
              label="Eligible game slugs"
              values={c.games}
              change={(games) => {
                update({ games });
              }}
              help="Comma-separated permanent game slugs. Empty means any game."
            />
            <CSV
              key={`${selected.id}:${String(selected.version)}:services`}
              label="Eligible service keys"
              values={c.services}
              change={(services) => {
                update({ services });
              }}
              help="Comma-separated keys; choose game slugs when restricting services."
            />
            <CSV
              key={`${selected.id}:${String(selected.version)}:packages`}
              label="Eligible package keys"
              values={c.packages}
              change={(packages) => {
                update({ packages });
              }}
              help="Comma-separated keys; choose game slugs when restricting packages. Empty includes custom services."
            />
            <Check
              label="Boosting category"
              value={c.categories.includes("boosting")}
              change={(enabled) => {
                update({
                  categories: enabled
                    ? [...c.categories, "boosting"]
                    : c.categories.filter((v) => v !== "boosting"),
                });
              }}
            />
            <Check
              label="Account resale category (platform funded)"
              value={c.categories.includes("account_resale")}
              change={(enabled) => {
                update({
                  categories: enabled
                    ? [...c.categories, "account_resale"]
                    : c.categories.filter((v) => v !== "account_resale"),
                });
              }}
            />
            <p>
              Resale discounts must not reduce accepted seller proceeds. Resale
              checkout becomes available with account commerce.
            </p>
            <Action disabled={!dirty} onClick={() => void save()}>
              Save coupon
            </Action>
            <Action
              onClick={() => {
                setSelected(null);
                setDirty(false);
                setHistory([]);
                setError(null);
                setNotice("");
              }}
            >
              Discard changes / close
            </Action>
            {selected.id && (
              <Action disabled={dirty} onClick={() => void loadHistory()}>
                Coupon revision history
              </Action>
            )}
          </fieldset>
          {history.length > 0 && (
            <section>
              <h3>Coupon revision history</h3>
              <p>
                Saved policy snapshots; existing accepted contracts retain their
                own snapshots.
              </p>
              {history.map((item) => (
                <details key={item.version}>
                  <summary>Revision {item.version}</summary>
                  <pre className="coupon-history">
                    {JSON.stringify(item.definition, null, 2)}
                  </pre>
                </details>
              ))}
              {history.length === 20 && (
                <Action
                  onClick={() => void loadHistory(history.at(-1)?.version)}
                >
                  Older coupon revisions
                </Action>
              )}
            </section>
          )}
        </section>
      )}
    </section>
  );
}
