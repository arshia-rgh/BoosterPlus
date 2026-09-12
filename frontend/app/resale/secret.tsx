import { useEffect, useState } from "react";
import { z } from "zod";
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
      <legend>Protected ownership transfer</legend>
      <p>
        Use this protected field for login and recovery details. Ordinary
        listing fields and chat must never contain them. A recent sign-in is
        required.
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
  const [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!value) return;
    const hide = () => {
      setValue("");
    };
    const timer = setTimeout(hide, 60000);
    window.addEventListener("blur", hide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", hide);
    };
  }, [value]);
  async function reveal() {
    setBusy(true);
    setError(null);
    setValue("");
    try {
      const result = await post(path, {}, z.object({ value: z.string() }));
      const bytes = Uint8Array.from(atob(result.value), (c) => c.charCodeAt(0));
      setValue(new TextDecoder().decode(bytes));
      bytes.fill(0);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>Protected access</h3>
      <p>
        Reveals are audited and require recent sign-in. Details hide after one
        minute or when this window loses focus.
      </p>
      <ErrorNotice error={error} />
      <Action disabled={busy} onClick={() => void reveal()}>
        Reveal protected details
      </Action>
      {value && (
        <>
          <pre className="payment-policy">{value}</pre>
          <Action
            onClick={() => {
              setValue("");
            }}
          >
            Hide protected details
          </Action>
        </>
      )}
    </section>
  );
}
