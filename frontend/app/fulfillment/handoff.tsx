import { ActionFields } from "../ui/action-fields";
import { useState } from "react";
import { Action, ErrorNotice } from "../catalog/controls";
import { Input } from "../catalog/dynamic-form";
import { matches, type Answers } from "../catalog/model";
import { post } from "../identity/api";
import type { Detail } from "../orders/model";
import { workSchema, type Work } from "./model";
export default function Handoff({
  detail,
  work,
  reload,
}: {
  detail: Detail;
  work: Work;
  reload: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(work.handoff ?? {}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    service = detail.offer.configuration.services.find(
      (s) => s.key === detail.order.service,
    );
  if (!service) return null;
  const values = { ...detail.answers, ...answers },
    fields = service.fields.filter(
      (f) =>
        f.stage === "fulfillment" &&
        matches(f.visible_when, values, service.fields),
    );
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/fulfillment/${work.order_id}/handoff`,
        { version: work.version, order_version: work.order_version, answers },
        workSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (!fields.length) return null;
  return (
    <ActionFields error={error} busy={busy}>
      <section className="catalog-section">
        <h3>Fulfillment information</h3>
        <p>
          Add player and coordination details here. Share credentials only in a
          protected form requested in Messages.
        </p>
        <ErrorNotice error={error} />
        <fieldset disabled={busy}>
          <legend>Details for this service</legend>
          {fields.map((field) => (
            <Input
              key={field.key}
              field={field}
              config={detail.offer.configuration}
              value={values[field.key]}
              required={
                field.required ||
                (!!field.required_when &&
                  matches(field.required_when, values, service.fields))
              }
              error={undefined}
              change={(value) => {
                setAnswers((current) => {
                  const next = Object.fromEntries(
                    Object.entries(current).filter(
                      ([key]) => key !== field.key,
                    ),
                  );
                  if (value !== undefined) next[field.key] = value;
                  return next;
                });
              }}
            />
          ))}
        </fieldset>
        <Action
          disabled={busy}
          onClick={() => {
            void save();
          }}
        >
          Save fulfillment information
        </Action>
      </section>
    </ActionFields>
  );
}
