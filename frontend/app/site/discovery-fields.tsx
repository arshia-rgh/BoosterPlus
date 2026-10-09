import { useState } from "react";
import { Action, Check, Select, Text } from "../catalog/controls";
import MetricPolicyEditor from "../catalog/metric-policy-editor";
import { homeSchema, legalSchema, type Content } from "./model";

const kinds = ["boost", "accounts", "shop", "payment", "news"] as const;
export function HomeDiscoveryFields({ data }: { data: Content["data"] }) {
  const parsed = homeSchema.safeParse(data);
  const [savedIntroductions, setIntroductions] = useState(
    (parsed.success ? parsed.data.introductions : undefined) ??
      kinds.map((kind) => ({ kind, title: "", description: "" })),
  );
  const [includeIntroductions, setIncludeIntroductions] = useState(
    parsed.success && parsed.data.introductions != null,
  );
  const introductions = includeIntroductions ? savedIntroductions : undefined;
  const [metrics, setMetrics] = useState(
    parsed.success ? parsed.data.metrics : undefined,
  );
  return (
    <section aria-label="Homepage services and statistics">
      <h3>Service introductions</h3>
      <p>
        Homepage sections appear in this order: Boost, Accounts, Shop, Payment,
        News. Every section leads to the game picker. Copy stays private until
        publication.
      </p>
      <Check
        label="Use reviewed service introductions"
        value={introductions != null}
        change={setIncludeIntroductions}
      />
      {introductions?.map((item, index) => (
        <fieldset key={item.kind}>
          <legend>
            {item.kind === "boost"
              ? "Boosting"
              : item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}
          </legend>
          <Text
            name={`introductions.${String(index)}.title`}
            label={`${item.kind} section title`}
            value={item.title}
            help="Up to 100 characters."
            change={(title) => {
              setIntroductions(
                introductions.map((row) =>
                  row.kind === item.kind ? { ...row, title } : row,
                ),
              );
            }}
          />
          <Text
            name={`introductions.${String(index)}.description`}
            label={`${item.kind} section description`}
            multiline
            value={item.description}
            help="Up to 1,200 characters. Use reviewed claims only."
            change={(description) => {
              setIntroductions(
                introductions.map((row) =>
                  row.kind === item.kind ? { ...row, description } : row,
                ),
              );
            }}
          />
        </fieldset>
      ))}
      <MetricPolicyEditor path="metrics" value={metrics} change={setMetrics} />
      <input
        type="hidden"
        name="discovery_content"
        value={JSON.stringify({ introductions, metrics })}
      />
    </section>
  );
}

export function PolicyFields({ data }: { data: Content["data"] }) {
  const parsed = legalSchema.safeParse(data);
  const [sections, setSections] = useState(() =>
    (parsed.success ? (parsed.data.sections ?? []) : []).map((item) => ({
      ...item,
      editor_id: crypto.randomUUID(),
    })),
  );
  const options = [
    ["terms", "Terms"],
    ["privacy", "Privacy"],
    ["refunds", "Refunds"],
    ["account_sales", "Account sales"],
    ["contact", "Contact"],
    ["delivery", "Delivery"],
    ["cookies", "Cookies"],
    ["complaints", "Complaints"],
  ] as const;
  return (
    <section aria-label="Policy sections">
      <h3>Policy sections</h3>
      <p>
        Optional structured sections are part of this immutable legal revision.
        Keep the complete agreement above. Publishing does not rewrite a
        customer's previously accepted version. Enter approved policy; no legal
        text is generated here.
      </p>
      {sections.map((item, index) => (
        <fieldset key={item.editor_id}>
          <legend>Policy section {index + 1}</legend>
          <Select
            name={`sections.${String(index)}.kind`}
            label="Policy kind"
            value={item.kind}
            options={options.filter(
              ([kind]) =>
                kind === item.kind || !sections.some((s) => s.kind === kind),
            )}
            change={(kind) => {
              setSections(
                sections.map((row, i) =>
                  i === index
                    ? { ...row, kind: kind as typeof item.kind }
                    : row,
                ),
              );
            }}
          />
          <Text
            name={`sections.${String(index)}.title`}
            label="Policy section title"
            value={item.title}
            change={(title) => {
              setSections(
                sections.map((row, i) =>
                  i === index ? { ...row, title } : row,
                ),
              );
            }}
          />
          <Text
            name={`sections.${String(index)}.text`}
            label="Policy section text"
            value={item.text}
            multiline
            help="20–10,000 characters of approved plain text."
            change={(text) => {
              setSections(
                sections.map((row, i) =>
                  i === index ? { ...row, text } : row,
                ),
              );
            }}
          />
          <Action
            onClick={() => {
              setSections(sections.filter((_, i) => i !== index));
            }}
          >
            Remove policy section {index + 1}
          </Action>
        </fieldset>
      ))}
      <Action
        disabled={sections.length >= 8}
        onClick={() => {
          const next = options.find(
            ([kind]) => !sections.some((s) => s.kind === kind),
          );
          if (next)
            setSections([
              ...sections,
              {
                kind: next[0],
                title: "",
                text: "",
                editor_id: crypto.randomUUID(),
              },
            ]);
        }}
      >
        Add policy section
      </Action>
      <input
        type="hidden"
        name="sections"
        value={JSON.stringify(
          sections.map((item) => ({
            kind: item.kind,
            title: item.title,
            text: item.text,
          })),
        )}
      />
    </section>
  );
}
