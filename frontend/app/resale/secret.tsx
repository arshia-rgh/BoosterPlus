import { useState } from "react";
import {
  useProtectedReveal,
  useProtectedRevealFocus,
} from "../identity/protected-reveal";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { secretSchema } from "./model";

export function SecretUpload({
  path,
  version,
  changed,
}: {
  path: string;
  version: number;
  changed: () => void;
}) {
  const [value, setValue] = useState(""),
    [expires, setExpires] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError(null);
    const bytes = new TextEncoder().encode(value);
    setValue("");
    try {
      await post(
        path,
        {
          version,
          request_key: crypto.randomUUID(),
          value: btoa(String.fromCharCode(...bytes)),
          expires_at: new Date(expires).toISOString(),
        },
        secretSchema,
      );
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      bytes.fill(0);
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy}>
      <legend>Protected account details</legend>
      <p>
        Use this protected field for login and recovery details. Ordinary
        listing fields and chat must never contain them. If confirmation is
        needed, verify here with an authenticator or email code.
      </p>
      <ErrorNotice error={error} />
      <Text
        label="Protected transfer details"
        type="password"
        value={value}
        change={(v) => {
          setValue(v.slice(0, 8000));
        }}
      />
      <Text
        label="Protected details expiry"
        type="datetime-local"
        value={expires}
        change={setExpires}
      />
      <Action disabled={!value || !expires} onClick={() => void save()}>
        Store protected transfer
      </Action>
    </fieldset>
  );
}
export function SecretReveal({ path }: { path: string }) {
  const { value, busy, error, reveal, hide } = useProtectedReveal(path, 60000);
  const {
    result: resultRef,
    problem: problemRef,
    trigger: triggerRef,
    hideExplicitly,
  } = useProtectedRevealFocus(Boolean(value), busy, error, path);
  return (
    <section className="catalog-section">
      <h3>Protected access</h3>
      <p>
        Reveals are audited. If confirmation is needed, verify here with an
        authenticator or email code. Details hide after one minute or when this
        window loses focus.
      </p>
      <div
        ref={problemRef}
        tabIndex={-1}
        role="group"
        aria-label="Protected access notice"
      >
        <ErrorNotice error={error} />
      </div>
      <div ref={triggerRef}>
        <Action disabled={busy} onClick={() => void reveal()}>
          Reveal protected details
        </Action>
      </div>
      {value && (
        <>
          <h4 ref={resultRef} tabIndex={-1}>
            Protected details ready
          </h4>
          <pre className="payment-policy">{value}</pre>
          <Action
            onClick={() => {
              hideExplicitly(hide);
            }}
          >
            Hide protected details
          </Action>
        </>
      )}
    </section>
  );
}
