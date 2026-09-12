import { useState } from "react";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { post } from "../identity/api";
import {
  settingsSchema,
  remedyLabels,
  remedyText,
  emptyRemedies,
  type Settings,
} from "./model";
export default function PaymentPolicyEditor({
  settings,
  done,
}: {
  settings: Settings;
  done: () => void;
}) {
  const [data, setData] = useState(settings.draft),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const remedies = data.remedies ?? emptyRemedies;
  async function save(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        "/admin/finance/policy",
        { version: settings.version, action, data },
        settingsSchema,
      );
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h2>Payment policy</h2>
      <p>
        Publishing preserves previous agreements. Enter approved fees, supported
        assets and policy text. Recent sign-in and authenticator verification
        are required.
      </p>
      <p>
        Merchant configuration: {settings.configured ? "configured" : "pending"}{" "}
        · Checkout: {settings.enabled ? "enabled" : "disabled"}
      </p>
      <fieldset disabled={busy}>
        <legend>Revision {settings.version}</legend>
        <Text
          label="Policy title"
          value={data.label}
          change={(label) => {
            setData({ ...data, label });
          }}
        />
        <Text
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
            Enter approved terms. Blank fields cannot be published. These terms
            are saved with each checkout.
          </p>
          {remedyLabels.map(([key, label]) => (
            <Text
              key={key}
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
          label="Processing fees paid by"
          value={data.fee_mode}
          change={(fee_mode) => {
            setData({ ...data, fee_mode });
          }}
          options={[
            ["", "Choose fee treatment"],
            ["merchant", "Booster Plus"],
            ["customer", "Customer"],
          ]}
        />
        <Select
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
          label="Local checkout window in minutes (15–1440)"
          value={data.window_minutes}
          change={(window_minutes) => {
            setData({ ...data, window_minutes });
          }}
        />
        <fieldset>
          <legend>Order pricing currencies</legend>
          {["USD", "EUR", "GBP"].map((code) => (
            <Check
              key={code}
              label={code}
              value={data.currencies.includes(code)}
              change={(on) => {
                setData({
                  ...data,
                  currencies: on
                    ? [...data.currencies, code]
                    : data.currencies.filter((v) => v !== code),
                });
              }}
            />
          ))}
        </fieldset>
        {data.routes.map((route, index) => (
          <fieldset key={index}>
            <legend>Asset and network {index + 1}</legend>
            {(
              [
                ["code", "NOWPayments asset code"],
                ["label", "Customer label"],
                ["network", "Network identifier"],
              ] as const
            ).map(([key, label]) => (
              <Text
                key={key}
                label={label}
                value={
                  key === "code"
                    ? route.code
                    : key === "label"
                      ? route.label
                      : route.network
                }
                change={(value) => {
                  setData({
                    ...data,
                    routes: data.routes.map((v, i) =>
                      i === index ? { ...v, [key]: value } : v,
                    ),
                  });
                }}
              />
            ))}
            <Action
              onClick={() => {
                setData({
                  ...data,
                  routes: data.routes.filter((_, i) => i !== index),
                });
              }}
            >
              Remove asset and network {index + 1}
            </Action>
          </fieldset>
        ))}
        <Action
          disabled={data.routes.length >= 20}
          onClick={() => {
            setData({
              ...data,
              routes: [...data.routes, { code: "", label: "", network: "" }],
            });
          }}
        >
          Add asset and network
        </Action>
        <div className="catalog-actions">
          <Action onClick={() => void save("save")}>Save policy draft</Action>
          <Action onClick={() => void save("publish")}>
            Publish payment policy
          </Action>
        </div>
      </fieldset>
      <ErrorNotice error={error} />
    </section>
  );
}
