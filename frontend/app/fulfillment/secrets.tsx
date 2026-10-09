import { useEffect, useId, useRef, useState } from "react";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import {
  useProtectedReveal,
  useProtectedRevealFocus,
} from "../identity/protected-reveal";
import { useResource } from "../orders/resource";
import { active, secretSchema, type Work } from "./model";
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
            Only authorized staff can reveal this. When confirmation is needed,
            they use an authenticator or email code. You cannot read the saved
            value back.
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
  const { value, busy, error, reveal, hide } = useProtectedReveal(
    `/${admin ? "admin" : "booster"}/fulfillment/${work.order_id}/secret/reveal`,
    30000,
  );
  const {
    result: resultRef,
    problem: problemRef,
    trigger: triggerRef,
    hideExplicitly,
  } = useProtectedRevealFocus(Boolean(value), busy, error, work.order_id);
  if (work.mode !== "account" || !active(work)) return null;
  return (
    <section className="catalog-section">
      <h3>Game access</h3>
      <p>
        Access is audited and requires recent authenticator or email
        verification. The value hides after 30 seconds or when this page loses
        focus.
      </p>
      <div
        ref={problemRef}
        tabIndex={-1}
        role="group"
        aria-label="Game access notice"
      >
        <ErrorNotice error={error} />
      </div>
      {value ? (
        <>
          <h4 ref={resultRef} tabIndex={-1}>
            Game access ready
          </h4>
          <pre className="secret-value">{value}</pre>
          <Action
            onClick={() => {
              hideExplicitly(hide);
            }}
          >
            Hide game access
          </Action>
        </>
      ) : (
        <div ref={triggerRef}>
          <Action
            disabled={busy}
            onClick={() => {
              void reveal();
            }}
          >
            Reveal game access
          </Action>
        </div>
      )}
    </section>
  );
}
