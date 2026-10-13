import { useRef, useState } from "react";
import { configurationSchema, type Configuration } from "./model";
import { z } from "../validation";

const maximumBytes = 256 * 1024;

function knownKeys(input: unknown, output: unknown): boolean {
  if (Array.isArray(input))
    return (
      Array.isArray(output) &&
      input.every((value, i) => knownKeys(value, output.at(i)))
    );
  if (input && typeof input === "object")
    return (
      !!output &&
      typeof output === "object" &&
      Object.entries(input).every(
        ([key, value]) =>
          Object.hasOwn(output, key) &&
          knownKeys(value, Reflect.get(output, key)),
      )
    );
  return true;
}

const importSchema = z.object({
  game_slug: z.string().min(1),
  base_revision: z.number().int().positive(),
  configuration: configurationSchema,
});
type PreparedImport = z.infer<typeof importSchema>;

export function readConfigurationImport(text: string): PreparedImport {
  if (new TextEncoder().encode(text).length > maximumBytes)
    throw new Error("Use a configuration smaller than 256 KB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error(
      "This is not valid JSON. Paste the complete configuration and try again.",
    );
  }
  const result = importSchema.safeParse(input);
  if (!result.success || !knownKeys(input, result.data))
    throw new Error(
      "Use a prepared configuration with game_slug, base_revision and configuration. Missing, unsupported or invalid fields cannot be imported.",
    );
  return {
    ...result.data,
    configuration: { ...result.data.configuration, reviewed: false },
  };
}

/** Local authoring only: saving, revision checks, review and publication remain unchanged. */
export default function ConfigurationImport({
  current,
  dirty,
  slug,
  revision,
  change,
}: {
  current: Configuration;
  dirty: boolean;
  slug: string;
  revision: number;
  change: (configuration: Configuration) => void;
}) {
  const [text, setText] = useState("");
  const [candidate, setCandidate] = useState<PreparedImport | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const source = useRef<HTMLTextAreaElement>(null);
  const result = useRef<HTMLDivElement>(null);
  return (
    <details className="catalog-section">
      <summary>Import or export a prepared configuration</summary>
      <p>
        Import replaces this draft's configuration. It does not publish changes
        or modify existing orders. Save any current edits first.
      </p>
      <p>
        Prepare the import from /{slug}, draft revision {revision}. Its
        game_slug and base_revision must match; review and merge newer edits
        before importing an older configuration.
      </p>
      <div className="catalog-import-controls">
        <button
          type="button"
          className="button secondary"
          disabled={dirty}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    {
                      game_slug: slug,
                      base_revision: revision,
                      configuration: current,
                    },
                    null,
                    2,
                  ) + "\n",
                ],
                { type: "application/json" },
              ),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `playora-${slug}-revision-${String(revision)}.json`;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          }}
        >
          Export saved configuration
        </button>
        <label htmlFor="catalog-import">
          Catalog configuration (JSON, up to 256 KB)
        </label>
        <textarea
          id="catalog-import"
          ref={source}
          value={text}
          rows={6}
          maxLength={maximumBytes}
          aria-invalid={!!error || undefined}
          aria-describedby="catalog-import-result"
          onChange={(event) => {
            setText(event.target.value);
            setCandidate(null);
            setError("");
            setMessage("");
          }}
        />
        <button
          type="button"
          className="button secondary"
          disabled={dirty || !text.trim()}
          onClick={() => {
            setCandidate(null);
            setMessage("");
            try {
              const next = readConfigurationImport(text);
              if (
                next.game_slug !== slug ||
                next.configuration.name !== current.name
              )
                throw new Error(
                  "The game name does not match this draft. Import into the matching game.",
                );
              if (next.base_revision !== revision)
                throw new Error(
                  "The source draft revision is outdated. Compare with the latest saved draft and merge newer edits before preparing this import again.",
                );
              setCandidate(next);
              setError("");
              requestAnimationFrame(() => result.current?.focus());
            } catch (cause) {
              setError(
                cause instanceof Error && cause.name !== "RangeError"
                  ? cause.message
                  : "This configuration is too complex. Use a compatible catalog export.",
              );
              source.current?.focus();
            }
          }}
        >
          Review import
        </button>
        <div id="catalog-import-result" ref={result} tabIndex={-1}>
          {dirty && !message && (
            <p>Save your current edits before preparing another import.</p>
          )}
          {error && <p role="alert">{error}</p>}
          {candidate && (
            <>
              <h4>
                Replace the draft configuration for{" "}
                {candidate.configuration.name}
              </h4>
              <p>
                Prepared from draft revision {candidate.base_revision}.{" "}
                {candidate.configuration.references.length} reference catalogs,{" "}
                {candidate.configuration.services.length} services,{" "}
                {candidate.configuration.packages.length} packages and{" "}
                {candidate.configuration.faqs.length} FAQs.
              </p>
              <p>
                Services:{" "}
                {candidate.configuration.services
                  .map((service) => service.name)
                  .join(", ") || "None"}
                .
              </p>
              <p>
                Packages:{" "}
                {candidate.configuration.packages
                  .map((pack) => pack.name)
                  .join(", ") || "None"}
                .
              </p>
              <p>
                All game text, artwork, forms, price rules, seller intake and
                featured offers will use the imported values. Review each
                section before saving and publishing.
              </p>
              <p>
                Before saving, use Discard unsaved edits in Review &amp; publish
                to restore the saved draft.
              </p>
              <div className="catalog-import-actions">
                <button
                  type="button"
                  className="button"
                  disabled={
                    dirty ||
                    candidate.base_revision !== revision ||
                    candidate.game_slug !== slug
                  }
                  onClick={() => {
                    change(candidate.configuration);
                    setCandidate(null);
                    setText("");
                    setMessage(
                      "Configuration loaded into the unsaved draft. Review its sections, save, then preview before publishing.",
                    );
                    requestAnimationFrame(() => result.current?.focus());
                  }}
                >
                  Use in unsaved draft
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setCandidate(null);
                    source.current?.focus();
                  }}
                >
                  Cancel import
                </button>
              </div>
            </>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      </div>
    </details>
  );
}
