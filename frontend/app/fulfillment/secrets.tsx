import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Action, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { active, revealSchema, secretSchema, type Work } from "./model";
export function CustomerSecret({ work }: { work: Work }) {
  const base = `/fulfillment/${work.order_id}/secret`,
    status = useResource(
      base + `?revision=${String(work.version)}`,
      secretSchema,
    ),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    id = useId(),
    mounted = useRef(true),
    retry = useRef<{ key: string; expiry: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const bytes = new TextEncoder().encode(value);
      if (!bytes.length || bytes.length > 8192)
        throw new Error("Game access must fit within 8 KiB.");
      const prepared = retry.current ?? {
        key: crypto.randomUUID(),
        expiry: new Date(
          Date.now() + Math.max(1, work.secret_hours * 3600 - 60) * 1000,
        ).toISOString(),
      };
      retry.current = prepared;
      const encoded = btoa(String.fromCharCode(...bytes));
      bytes.fill(0);
      await post(
        base,
        {
          version: status.data?.version ?? 0,
          work_version: work.version,
          request_key: prepared.key,
          expires_at: prepared.expiry,
          value: encoded,
        },
        secretSchema,
      );
      if (mounted.current) {
        setValue("");
        retry.current = null;
        status.reload();
      }
    } catch (cause) {
      if (mounted.current) setError(cause);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    try {
      await post(
        base + "/revoke",
        { version: status.data?.version ?? 0 },
        z.unknown(),
      );
      if (mounted.current) {
        setValue("");
        retry.current = null;
        status.reload();
      }
    } catch (cause) {
      if (mounted.current) setError(cause);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>Temporary game access</h3>
      <p>
        Use temporary game credentials only. Never share your Google/email
        password or recovery codes. Change your game password after reassignment
        or completion.
      </p>
      <ErrorNotice error={error ?? status.error} />
      {status.data && (
        <p>
          Status: {status.data.state}
          {status.data.state === "active" && status.data.expires_at && (
            <> · expires {new Date(status.data.expires_at).toLocaleString()}</>
          )}
        </p>
      )}
      {active(work) && (
        <>
          <label htmlFor={id}>Temporary game login instructions</label>
          <textarea
            id={id}
            autoComplete="off"
            spellCheck={false}
            maxLength={8192}
            value={value}
            disabled={busy}
            onChange={(event) => {
              setValue(event.target.value);
              retry.current = null;
            }}
          />
          <p>
            Only authorized staff can reveal this after recent sign-in and
            authenticator verification. You cannot read the saved value back.
          </p>
          <Action
            disabled={busy || !value.trim() || !status.data || !!status.error}
            onClick={() => {
              void submit();
            }}
          >
            Save temporary game access
          </Action>
        </>
      )}
      {status.data?.state === "active" && (
        <Action
          disabled={busy}
          onClick={() => {
            void revoke();
          }}
        >
          Revoke game access
        </Action>
      )}
    </section>
  );
}
export function StaffSecret({ work, admin }: { work: Work; admin: boolean }) {
  const [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!value) return;
    const clear = () => {
      setValue("");
    };
    const timer = window.setTimeout(clear, 30000);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [value]);
  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const data = await post(
        `/${admin ? "admin" : "booster"}/fulfillment/${work.order_id}/secret/reveal`,
        {},
        revealSchema,
      );
      const bytes = Uint8Array.from(atob(data.value), (char) =>
        char.charCodeAt(0),
      );
      const text = new TextDecoder().decode(bytes);
      bytes.fill(0);
      if (mounted.current) setValue(text);
    } catch (cause) {
      if (mounted.current) setError(cause);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  if (work.mode !== "account" || !active(work)) return null;
  return (
    <section className="catalog-section">
      <h3>Game access</h3>
      <p>
        Access is audited and requires recent verification of both factors. The
        value hides after 30 seconds or when this page loses focus.
      </p>
      <ErrorNotice error={error} />
      {value ? (
        <>
          <pre className="secret-value">{value}</pre>
          <Action
            onClick={() => {
              setValue("");
            }}
          >
            Hide game access
          </Action>
        </>
      ) : (
        <Action
          disabled={busy}
          onClick={() => {
            void reveal();
          }}
        >
          Reveal game access
        </Action>
      )}
    </section>
  );
}
