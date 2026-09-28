import { HomeDiscoveryFields, PolicyFields } from "./discovery-fields";
import { useState, useId } from "react";
import { Action, Text } from "../catalog/controls";
import { value } from "../identity/identity";
import { parseContent } from "./validation";
import {
  homeDiscoverySchema,
  legalSchema,
  defaultHome,
  homeSchema,
  retentionSchema,
  type Content,
} from "./model";
const fieldLimits = new Map<string, number>([
  ["headline", 80],
  ["accent", 80],
  ["description", 400],
  ["notice", 300],
  ["start_rank", 60],
  ["end_rank", 60],
  ["scene_description", 400],
  ["contact_email", 254],
  ["support_hours", 300],
  ["text", 50000],
  ["policy_text", 10000],
  ["backup_policy", 4000],
  ["label", 64],
  ["activity_subject", 100],
  ["availability_subject", 100],
  ["activity_intro", 500],
  ["availability_intro", 500],
  ["footer", 1000],
]);
function Field({
  name,
  label,
  initial = "",
  multiline = false,
  required = true,
}: {
  name: string;
  label: string;
  initial?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="catalog-label">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          defaultValue={initial}
          required={required}
          maxLength={fieldLimits.get(name) ?? 400}
        />
      ) : (
        <input
          id={id}
          name={name}
          defaultValue={initial}
          required={required}
          maxLength={fieldLimits.get(name) ?? 400}
        />
      )}
    </div>
  );
}
function HomeFields({ data }: { data: Content["data"] }) {
  const parsed = homeSchema.safeParse(data),
    initial = parsed.success ? parsed.data : defaultHome;
  const [faqs, setFAQs] = useState(initial.faqs),
    [featured, setFeatured] = useState(initial.featured);
  return (
    <>
      <Field
        name="headline"
        label="Headline"
        initial={initial.headline}
        multiline
      />
      <Field name="accent" label="Headline accent" initial={initial.accent} />
      <Field
        name="description"
        label="Introduction"
        initial={initial.description}
        multiline
      />
      <Field
        name="notice"
        label="Availability notice"
        initial={initial.notice}
        required={false}
      />
      <Field
        name="start_rank"
        label="Starting rank label"
        initial={initial.start_rank}
      />
      <Field
        name="end_rank"
        label="Destination rank label"
        initial={initial.end_rank}
      />
      <Field
        name="scene_description"
        label="Rank journey description"
        initial={initial.scene_description}
        multiline
      />
      <label>
        Hero artwork
        <select name="artwork" defaultValue={initial.artwork}>
          <option value="ascension">Original ascent artwork</option>
          <option value="none">Text and gradient</option>
        </select>
      </label>
      {(
        [
          ["show_scene", "Show animated rank journey", initial.show_scene],
          ["show_pathways", "Show boost pathways", initial.show_pathways],
          ["show_steps", "Show order steps", initial.show_steps],
        ] as const
      ).map(([name, label, checked]) => (
        <label className="check" key={name}>
          <input type="checkbox" name={name} defaultChecked={checked} />
          {label}
        </label>
      ))}
      <Field
        name="contact_email"
        label="Business contact email"
        initial={initial.contact_email}
        required={false}
      />
      <Field
        name="support_hours"
        label="Support hours and timezone"
        initial={initial.support_hours}
        required={false}
      />
      <HomeDiscoveryFields data={data} />
      <h3>Frequently asked questions</h3>
      {faqs.map((faq, i) => (
        <fieldset key={i}>
          <legend>Question {i + 1}</legend>
          <Text
            label="Question"
            value={faq.question}
            change={(v) => {
              setFAQs(
                faqs.map((f, j) => (j === i ? { ...f, question: v } : f)),
              );
            }}
          />
          <Text
            label="Answer"
            multiline
            value={faq.answer}
            change={(v) => {
              setFAQs(faqs.map((f, j) => (j === i ? { ...f, answer: v } : f)));
            }}
          />
          <Action
            onClick={() => {
              setFAQs(faqs.filter((_, j) => i !== j));
            }}
          >
            Remove question {i + 1}
          </Action>
        </fieldset>
      ))}
      <Action
        disabled={faqs.length >= 20}
        onClick={() => {
          setFAQs([...faqs, { question: "", answer: "" }]);
        }}
      >
        Add question
      </Action>
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <h3>Featured offerings</h3>
      <p>
        Use a published /games or /accounts destination. Payment and
        availability stay governed by the offering.
      </p>
      {featured.map((item, i) => (
        <fieldset key={i}>
          <legend>Featured offering {i + 1}</legend>
          <Text
            label="Offering label"
            value={item.label}
            change={(v) => {
              setFeatured(
                featured.map((f, j) => (j === i ? { ...f, label: v } : f)),
              );
            }}
          />
          <Text
            label="Internal offering path"
            value={item.href}
            change={(v) => {
              setFeatured(
                featured.map((f, j) => (j === i ? { ...f, href: v } : f)),
              );
            }}
          />
          <Action
            onClick={() => {
              setFeatured(featured.filter((_, j) => i !== j));
            }}
          >
            Remove offering {i + 1}
          </Action>
        </fieldset>
      ))}
      <Action
        disabled={featured.length >= 8}
        onClick={() => {
          setFeatured([...featured, { label: "", href: "/games" }]);
        }}
      >
        Add featured offering
      </Action>
      <input type="hidden" name="featured" value={JSON.stringify(featured)} />
    </>
  );
}
function RetentionFields({ data }: { data: Content["data"] }) {
  const parsed = retentionSchema.safeParse(data),
    initial = parsed.success ? parsed.data : null;
  return (
    <>
      <p>
        Enter every period explicitly. These are minimum days after the latest
        relevant record before profile erasure. Active business records always
        hold deletion. Financial agreements, transfer evidence, dispute evidence
        and audit history are preserved. Backup erasure follows the policy
        entered below.
      </p>
      {(
        [
          ["financial_days", "Financial records"],
          ["dispute_days", "Closed disputes"],
          ["audit_days", "Security audit history"],
          ["support_days", "Resolved ordinary support"],
          ["grace_days", "Grace period after request"],
        ] as const
      ).map(([name, label]) => (
        <label key={name}>
          {label} (days)
          <input
            type="number"
            name={name}
            min="0"
            max="36500"
            step="1"
            required
            defaultValue={
              new Map([
                ["financial_days", initial?.financial_days],
                ["dispute_days", initial?.dispute_days],
                ["audit_days", initial?.audit_days],
                ["support_days", initial?.support_days],
                ["grace_days", initial?.grace_days],
              ]).get(name) ?? ""
            }
          />
        </label>
      ))}
      <Field
        name="policy_text"
        label="Customer-facing retention and retained-evidence policy"
        initial={initial?.policy_text ?? ""}
        multiline
      />
      <Field
        name="backup_policy"
        label="Backup retention and deletion policy"
        initial={initial?.backup_policy ?? ""}
        multiline
      />
      <label className="check">
        <input
          type="checkbox"
          name="preserve_evidence"
          required
          defaultChecked={initial?.preserve_evidence ?? false}
        />
        I approve preserving financial, dispute and audit evidence as described
        above.
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial?.enabled ?? false}
        />
        Enable customer deletion requests under this published policy
      </label>
    </>
  );
}
export function contentData(
  kind: string,
  data: FormData,
): Record<string, unknown> {
  if (kind === "legal")
    return parseContent(legalSchema, {
      text: value(data, "text"),
      sections: JSON.parse(value(data, "sections")) as unknown,
    });
  if (kind === "notifications")
    return Object.fromEntries(
      [
        "activity_subject",
        "activity_intro",
        "availability_subject",
        "availability_intro",
        "footer",
      ].map((key) => [key, value(data, key)]),
    );
  if (kind === "retention")
    return parseContent(retentionSchema, {
      enabled: data.has("enabled"),
      preserve_evidence: data.has("preserve_evidence"),
      policy_text: value(data, "policy_text"),
      backup_policy: value(data, "backup_policy"),
      ...Object.fromEntries(
        [
          "financial_days",
          "dispute_days",
          "audit_days",
          "support_days",
          "grace_days",
        ].map((key) => [
          key,
          value(data, key) === "" ? null : Number(value(data, key)),
        ]),
      ),
    });
  return parseContent(homeSchema, {
    ...parseContent(
      homeDiscoverySchema,
      JSON.parse(value(data, "discovery_content")) as unknown,
    ),
    ...Object.fromEntries(
      [
        "headline",
        "accent",
        "description",
        "notice",
        "start_rank",
        "end_rank",
        "scene_description",
        "artwork",
        "contact_email",
        "support_hours",
      ].map((key) => [key, value(data, key)]),
    ),
    ...Object.fromEntries(
      ["show_scene", "show_steps", "show_pathways"].map((key) => [
        key,
        data.has(key),
      ]),
    ),
    faqs: JSON.parse(value(data, "faqs")) as unknown,
    featured: JSON.parse(value(data, "featured")) as unknown,
  });
}

export function ContentFields({
  kind,
  content,
}: {
  kind: string;
  content: Content;
}) {
  const draftValues = new Map(Object.entries(content.data));
  return (
    <>
      {kind === "home" ? (
        <HomeFields data={content.data} />
      ) : kind === "notifications" ? (
        <>
          <p>
            Plain text only. Sign-in links, unsubscribe links, consent checks
            and availability warnings remain mandatory. Authentication emails
            are separate.
          </p>
          {(
            [
              [
                "activity_subject",
                "Activity email subject",
                "New activity on PLAYORA",
              ],
              [
                "activity_intro",
                "Activity email introduction",
                "There is an update in your PLAYORA account.",
              ],
              [
                "availability_subject",
                "Availability email subject",
                "An offer you follow has availability",
              ],
              [
                "availability_intro",
                "Availability email introduction",
                "An offer matching your subscription is available.",
              ],
              ["footer", "Email footer", ""],
            ] as const
          ).map(([name, label, fallback]) => (
            <Field
              key={name}
              name={name}
              label={label}
              multiline={!name.endsWith("subject")}
              required={name !== "footer"}
              initial={
                typeof draftValues.get(name) === "string"
                  ? String(draftValues.get(name))
                  : fallback
              }
            />
          ))}
        </>
      ) : kind === "retention" ? (
        <RetentionFields data={content.data} />
      ) : (
        <>
          <p>
            Publishing new terms requires the new version at the next sign-in
            and at new order acceptance. Existing agreements retain their
            accepted revision.
          </p>
          <Field
            name="text"
            label="Approved account terms and privacy text"
            initial={
              typeof content.data.text === "string" ? content.data.text : ""
            }
            multiline
          />
          <PolicyFields data={content.data} />
        </>
      )}
    </>
  );
}
