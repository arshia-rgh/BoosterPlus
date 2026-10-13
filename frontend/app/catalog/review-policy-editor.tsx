import { AgreementTemplate } from "../resale/agreement-template";
import { Action, Check, Ordering, Text, move, nextKey } from "./controls";
import { FieldEditor, RuleEditor } from "./editor-parts";
import {
  emptyField,
  reviewService,
  type Configuration,
  type ReviewPolicy,
} from "./model";
export default function ReviewPolicyEditor({
  config,
  change,
}: {
  config: Configuration;
  change: (value: ReviewPolicy | undefined) => void;
}) {
  const policy = config.review_policy;
  return (
    <section className="catalog-section">
      <h2>Verified-purchase review policy</h2>
      <p>
        Declare the publication rules before accepting feedback. Moderate
        personal data, spam, abuse and unrelated content; a low rating alone is
        not a reason to reject a review. Staff cannot rewrite customer feedback.
      </p>
      <Check
        label="Accept verified-purchase reviews"
        value={!!policy}
        change={(enabled) => {
          change(enabled ? { content: "", fields: [], rules: [] } : undefined);
        }}
      />
      {policy && (
        <>
          <AgreementTemplate
            label="Replace with approved review rules"
            apply={(defaults) => {
              change({ ...policy, content: defaults.review_policy });
            }}
          />
          <Text
            name={`review_policy.content`}
            label="Review publication policy"
            multiline
            value={policy.content}
            change={(content) => {
              change({ ...policy, content });
            }}
            help="Plain text, up to 8,000 characters. Customers accept the published version when writing or editing feedback."
          />
          {policy.fields.map((field, index) => (
            <details key={index} className="catalog-item">
              <summary>Feedback attribute: {field.label}</summary>
              <FieldEditor
                intake
                field={field}
                service={reviewService(policy)}
                config={config}
                change={(patch) => {
                  change({
                    ...policy,
                    fields: policy.fields.map((f, i) =>
                      i === index ? { ...f, ...patch } : f,
                    ),
                  });
                }}
              />
              <Ordering
                index={index}
                count={policy.fields.length}
                change={(direction) => {
                  change({
                    ...policy,
                    fields: move(policy.fields, index, direction),
                  });
                }}
                remove={() => {
                  change({
                    ...policy,
                    fields: policy.fields.filter((_, i) => i !== index),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={policy.fields.length >= 40}
            onClick={() => {
              change({
                ...policy,
                fields: [
                  ...policy.fields,
                  {
                    ...emptyField(nextKey("feedback", policy.fields)),
                    stage: "order",
                  },
                ],
              });
            }}
          >
            Add feedback attribute
          </Action>
          {policy.rules.map((rule, index) => (
            <details key={index} className="catalog-item">
              <summary>Feedback rule: {rule.key}</summary>
              <RuleEditor
                config={config}
                rule={rule}
                fields={policy.fields}
                change={(patch) => {
                  change({
                    ...policy,
                    rules: policy.rules.map((r, i) =>
                      i === index ? { ...r, ...patch } : r,
                    ),
                  });
                }}
              />
              <Ordering
                index={index}
                count={policy.rules.length}
                change={(direction) => {
                  change({
                    ...policy,
                    rules: move(policy.rules, index, direction),
                  });
                }}
                remove={() => {
                  change({
                    ...policy,
                    rules: policy.rules.filter((_, i) => i !== index),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={policy.rules.length >= 40}
            onClick={() => {
              change({
                ...policy,
                rules: [
                  ...policy.rules,
                  {
                    key: nextKey("feedback_rule", policy.rules),
                    kind: "reject",
                    message: "Review these feedback selections.",
                    from: "",
                    to: "",
                    from_units: "",
                    to_units: "",
                  },
                ],
              });
            }}
          >
            Add feedback rule
          </Action>
        </>
      )}
    </section>
  );
}
