import PolicyRoutes from "./policy-routes";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
import { policyIssues } from "./policy-validation";
import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import PolicyPreview from "./policy-preview";
import {
  Action,
  Check,
  ErrorNotice,
  Issues,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { APIError, post } from "../identity/api";
import {
  settingsSchema,
  remedyLabels,
  remedyText,
  emptyRemedies,
  type Settings,
  type Policy,
} from "./model";
export default function PaymentPolicyEditor({
  settings,
  done,
  unavailable = false,
  active = true,
}: {
  settings: Settings;
  done: () => void;
  unavailable?: boolean;
  active?: boolean;
}) {
  const [saved, setSaved] = useState(settings);
  const [data, updateData] = useState(settings.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [preview, setPreview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    undefined,
    active && !busy,
  );
  const lock = useRef(false);
  const previewPanel = useRef<HTMLElement>(null);
  const leavePanel = useRef<HTMLElement>(null);
  const dirty = JSON.stringify(data) !== JSON.stringify(saved.draft);
  const stale = settings.version > saved.version;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
  );
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
  useEffect(() => {
    if (blocker.state === "blocked") {
      leavePanel.current?.focus();
      leavePanel.current?.scrollIntoView({ block: "center" });
    }
  }, [blocker.state]);
  useEffect(() => {
    if (preview) previewPanel.current?.focus();
  }, [preview]);
  function reset(current: Settings) {
    setSaved(current);
    updateData(current.draft);
    setPreview(false);
    setReviewed(false);
    setError(null);
    setIssues([]);
  }
  if (stale && !dirty && !busy) reset(settings);
  function setData(value: Policy) {
    updateData(value);
    setPreview(false);
    setReviewed(false);
    setNotice("");
  }
  const remedies = data.remedies ?? emptyRemedies;
  async function save(action: "save" | "publish") {
    if (
      lock.current ||
      unavailable ||
      stale ||
      (action === "publish" && (dirty || !preview || !reviewed))
    )
      return;
    const invalid = policyIssues(data);
    setIssues(invalid);
    if (invalid.length) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const result = await post(
        "/admin/finance/policy",
        { version: saved.version, action, data },
        settingsSchema,
      );
      reset(result);
      setNotice(
        action === "publish"
          ? "Payment policy published. Existing agreements keep their accepted terms."
          : "Policy draft saved. Preview and review this saved revision before publishing.",
      );
      done();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) setIssues(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      {blocker.state === "blocked" && (
        <section
          ref={leavePanel}
          tabIndex={-1}
          role="alert"
          aria-label="Unsaved payment policy"
        >
          <h2>Keep your policy draft?</h2>
          <p>
            Leaving finance discards unsaved policy edits. Finance workspace
            sections preserve them.
          </p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Stay with policy draft
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard policy draft and leave
            </Action>
          </div>
        </section>
      )}
      <section hidden={!active} className="catalog-section">
        <h2>Payment policy</h2>
        <p>
          Publishing preserves previous agreements. Enter approved fees and
          policy text. Recent authenticator or email verification are required.
        </p>
        <p>
          Merchant configuration:{" "}
          {settings.configured ? "configured" : "pending"} · Checkout:{" "}
          {settings.enabled ? "enabled" : "disabled"}
          {" · Automatic provider transfers: "}
          {settings.outgoing_enabled === undefined
            ? "status unavailable"
            : settings.outgoing_enabled
              ? "enabled"
              : "disabled"}
        </p>
        <p>
          Saved revision {saved.version} ·{" "}
          {dirty ? "Unsaved changes" : "Draft saved"}
        </p>
        {saved.published && <p>Published agreement: {saved.published.id}</p>}
        {stale && dirty && (
          <section role="alert">
            <h3>A newer policy revision is available</h3>
            <p>
              Your draft is preserved. Review the current revision before
              replacing your local edits.
            </p>
            <details>
              <summary>Compare with current saved policy</summary>
              <PolicyPreview policy={settings.draft} />
            </details>
            <Action
              onClick={() => {
                reset(settings);
              }}
            >
              Discard local changes and use current policy
            </Action>
          </section>
        )}
        <ErrorNotice error={error} hideIssues />
        <Issues issues={issues} />
        {!!error && (
          <Action disabled={busy} onClick={done}>
            Check current policy revision
          </Action>
        )}
        {notice && <p role="status">{notice}</p>}
        <fieldset disabled={busy || stale || unavailable}>
          <legend>Edit saved revision {saved.version}</legend>
          <Text
            name="label"
            label="Policy title"
            value={data.label}
            change={(label) => {
              setData({ ...data, label });
            }}
          />
          <Text
            name="text"
            label="Customer payment policy"
            multiline
            value={data.text}
            change={(text) => {
              setData({ ...data, text });
            }}
          />
          <fieldset>
            <legend>Service remedies and appeal policy</legend>
            <p>
              Enter approved terms. Blank fields cannot be published. These
              terms are saved with each checkout.
            </p>
            {remedyLabels.map(([key, label]) => (
              <Text
                key={key}
                name={`remedies.${key}`}
                label={label}
                multiline
                value={remedyText(remedies, key)}
                change={(value) => {
                  setData({ ...data, remedies: { ...remedies, [key]: value } });
                }}
              />
            ))}
            {(
              [
                ["dispute_hours", "Dispute window in hours (1–8760)"],
                ["appeal_hours", "Appeal window in hours (0–720)"],
                ["max_appeals", "Maximum appeals (0–3)"],
              ] as const
            ).map(([key, label]) => (
              <NumberInput
                key={key}
                name={`remedies.${key}`}
                label={label}
                value={
                  key === "dispute_hours"
                    ? remedies.dispute_hours
                    : key === "appeal_hours"
                      ? remedies.appeal_hours
                      : remedies.max_appeals
                }
                change={(value) => {
                  setData({ ...data, remedies: { ...remedies, [key]: value } });
                }}
              />
            ))}
          </fieldset>
          <Select
            name="fee_mode"
            label="Processing fees paid by"
            value={data.fee_mode}
            change={(fee_mode) => {
              setData({ ...data, fee_mode });
            }}
            options={[
              ["", "Choose fee treatment"],
              ["merchant", "PLAYORA"],
              ["customer", "Customer"],
            ]}
          />
          <Select
            name="rate_mode"
            label="Exchange rate policy"
            value={data.rate_mode}
            change={(rate_mode) => {
              setData({ ...data, rate_mode });
            }}
            options={[
              ["", "Choose rate policy"],
              ["fixed", "Fixed"],
              ["floating", "Floating"],
            ]}
          />
          <NumberInput
            name="window_minutes"
            label="Local checkout window in minutes (15–1440)"
            value={data.window_minutes}
            change={(window_minutes) => {
              setData({ ...data, window_minutes });
            }}
          />
          <p>
            New checkouts are priced in USD. Manage accepted checkout coins and
            networks in your NOWPayments dashboard.
          </p>
          {!data.currencies.includes("USD") && (
            <Check
              name="currencies"
              label="Enable USD pricing"
              value={false}
              change={() => {
                setData({ ...data, currencies: ["USD"] });
              }}
            />
          )}
          <PolicyRoutes
            routes={data.routes}
            change={(routes) => {
              validation.correct("routes");
              setIssues((current) =>
                current.filter((issue) => !issue.path.startsWith("routes")),
              );
              setData({ ...data, routes });
            }}
          />
          <div className="catalog-actions">
            <Action disabled={!dirty} onClick={() => void save("save")}>
              Save policy draft
            </Action>
            <Action
              disabled={dirty}
              onClick={() => {
                setPreview(true);
              }}
            >
              Preview saved payment policy
            </Action>
          </div>
        </fieldset>
        {preview && (
          <section
            ref={previewPanel}
            tabIndex={-1}
            className="catalog-section"
            aria-label="Saved policy customer preview"
          >
            <p className="eyebrow">
              Admin workspace · Private customer preview · Revision{" "}
              {saved.version}
            </p>
            <h3>Review before publishing</h3>
            <PolicyPreview policy={saved.draft} />
            <fieldset disabled={busy || stale || dirty || unavailable}>
              <legend>Publish the reviewed revision</legend>
              <Check
                label="I reviewed these exact saved payment and remedy terms for customers"
                value={reviewed}
                change={setReviewed}
              />
              <Action disabled={!reviewed} onClick={() => void save("publish")}>
                Publish payment policy
              </Action>
            </fieldset>
          </section>
        )}
      </section>
    </FieldValidation>
  );
}
