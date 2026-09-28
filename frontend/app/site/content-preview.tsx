import type { Content } from "./model";
function label(key: string) {
  return key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "")
    return <p>Not set</p>;
  if (typeof value === "boolean")
    return <p>{value ? "Enabled" : "Disabled"}</p>;
  if (typeof value === "string" || typeof value === "number")
    return <p className="preserve-lines wrap-anywhere">{String(value)}</p>;
  if (Array.isArray(value))
    return value.length ? (
      <ol>
        {value.map((item: unknown, i) => (
          <li key={i}>
            <Value value={item} />
          </li>
        ))}
      </ol>
    ) : (
      <p>None configured</p>
    );
  if (typeof value === "object")
    return (
      <dl>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>
              <Value value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return null;
}
export function ContentPreview({ content }: { content: Content }) {
  return (
    <section className="catalog-section" aria-label="Readable saved content">
      <h3>
        {label(content.kind)} ·{" "}
        {content.label || `Draft ${String(content.version)}`}
      </h3>
      <p>
        Saved revision {content.version}. Values below are rendered as text;
        publication uses this exact saved content.
      </p>
      <Value value={content.data} />
    </section>
  );
}
