import { useState } from "react";
import { useSearchParams } from "react-router";
import { Action } from "../catalog/controls";
export function directorySearch(raw: string): string {
  const input = new URLSearchParams(raw),
    out = new URLSearchParams();
  const customer = input.get("customer"),
    state = input.get("state"),
    after = input.get("after");
  if (
    customer &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      customer,
    )
  )
    out.set("customer", customer);
  if (
    state &&
    /^(pending|uploaded|queued|ready|rejected|deleted|active|suppressed|unsubscribed)$/.test(
      state,
    )
  )
    out.set("state", state);
  if (after && /^[a-zA-Z0-9_-]{1,180}$/.test(after)) out.set("after", after);
  return out.toString();
}
export function useDirectoryFilters() {
  const [params, setParams] = useSearchParams();
  const query = directorySearch(params.toString());
  const current = new URLSearchParams(query);
  return {
    query,
    after: current.get("after") ?? "",
    setAfter: (v: string) => {
      if (v) current.set("after", v);
      else current.delete("after");
      setParams(current);
    },
    apply: (customer: string, state: string) => {
      setParams(new URLSearchParams({ customer, state }));
    },
  };
}
export function DirectoryFilters({
  query,
  apply,
  states,
  customerLabel = "Customer ID",
}: {
  query: string;
  apply: (customer: string, state: string) => void;
  states: readonly string[];
  customerLabel?: string;
}) {
  const initial = new URLSearchParams(query),
    [customer, setCustomer] = useState(initial.get("customer") ?? ""),
    [state, setState] = useState(initial.get("state") ?? "");
  return (
    <form
      className="catalog-grid"
      onSubmit={(e) => {
        e.preventDefault();
        apply(customer.trim(), state);
      }}
    >
      <label className="catalog-label">
        {customerLabel}
        <input
          value={customer}
          onChange={(e) => {
            setCustomer(e.target.value);
          }}
          maxLength={36}
          pattern="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
          aria-describedby="directory-customer-help"
        />
      </label>
      <p id="directory-customer-help">
        Use a complete account UUID, or leave empty for all accounts. Filters
        apply when submitted.
      </p>
      <label className="catalog-label">
        Status
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {states.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button">
        Apply filters
      </button>
      <Action
        onClick={() => {
          setCustomer("");
          setState("");
          apply("", "");
        }}
      >
        Clear filters
      </Action>
    </form>
  );
}
export function mediaReturn(state: unknown): string | null {
  if (
    !state ||
    typeof state !== "object" ||
    !("mediaSearch" in state) ||
    typeof state.mediaSearch !== "string" ||
    state.mediaSearch.length > 2048
  )
    return null;
  const search = directorySearch(state.mediaSearch);
  return "/admin/media" + (search ? `?${search}` : "");
}
