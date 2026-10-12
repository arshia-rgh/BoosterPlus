import ArtworkUpload from "../artwork/upload";
import ImageRowEditor from "./image-row-editor";
import { useState, useRef, useContext } from "react";
import { FieldValidation } from "../ui/form-validation";
import { Action, Select, Text } from "../catalog/controls";
import { blockKinds, emptyBlock, type Block } from "./model";
export function BlocksEditor({
  value,
  change,
}: {
  value: Block[];
  change: (blocks: Block[]) => void;
}) {
  const [keys, setKeys] = useState(() => value.map((_, i) => String(i)));
  const nextKey = useRef(value.length);
  const validation = useContext(FieldValidation);
  const container = useRef<HTMLElement>(null);
  const focus = (i: number) => {
    requestAnimationFrame(() => {
      (
        container.current?.querySelector<HTMLElement>(
          `[data-block-index="${String(i)}"] input, [data-block-index="${String(i)}"] textarea, [data-block-index="${String(i)}"] button`,
        ) ??
        container.current?.querySelector<HTMLElement>('[name="new_block_kind"]')
      )?.focus();
    });
  };
  const [kind, setKind] = useState<Block["kind"]>("paragraph");
  const update = (index: number, patch: Partial<Block>) => {
    change(value.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };
  function insert(index: number) {
    if (value.length >= 100) return;
    const key = String(nextKey.current++);
    setKeys((old) => [...old.slice(0, index), key, ...old.slice(index)]);
    change([...value.slice(0, index), emptyBlock(kind), ...value.slice(index)]);
    focus(index);
  }
  const label = kind === "gallery" ? "image row" : `${kind} block`;
  return (
    <section
      ref={container}
      className="news-blocks"
      data-news-field="blocks"
      tabIndex={-1}
    >
      <h3>Article body</h3>
      <p>
        Use structured blocks. Text is rendered literally; HTML, scripts and
        embedded widgets are not supported.
      </p>
      <Select
        name="new_block_kind"
        label="New block type"
        value={kind}
        options={blockKinds.map((v) => [
          v,
          v === "gallery" ? "Image row · up to 4 images" : v,
        ])}
        change={(v) => {
          const selected = blockKinds.find((b) => b === v);
          if (selected) setKind(selected);
        }}
      />
      {value.map((b, i) => (
        <fieldset
          className="news-block"
          key={keys.at(i) ?? `external-${String(i)}`}
          name={`blocks.${String(i)}`}
          data-block-index={i}
          tabIndex={-1}
        >
          {validation?.issues
            .filter((v) => v.path === `blocks.${String(i)}`)
            .map((v) => (
              <p className="field-error" key={v.path}>
                {v.message}
              </p>
            ))}
          <legend>
            Block {i + 1} · {b.kind}
          </legend>
          {!["list", "image"].includes(b.kind) && (
            <Text
              name={`blocks.${String(i)}.text`}
              label={
                b.kind === "gallery"
                  ? "Image row description (optional)"
                  : b.kind === "table"
                    ? "Table caption"
                    : b.kind === "heading"
                      ? "Heading"
                      : b.kind === "link"
                        ? "Link text"
                        : "Text"
              }
              value={b.text}
              multiline={["paragraph", "quote", "code"].includes(b.kind)}
              change={(text) => {
                update(i, { text });
              }}
            />
          )}
          {b.kind === "heading" && (
            <Select
              label="Heading level"
              value={String(b.level)}
              options={[
                ["2", "Section"],
                ["3", "Subsection"],
              ]}
              change={(v) => {
                update(i, { level: Number(v) });
              }}
            />
          )}
          {b.kind === "link" && (
            <Text
              label="HTTPS URL"
              value={b.url}
              change={(url) => {
                update(i, { url });
              }}
            />
          )}
          {b.kind === "image" && (
            <>
              <ArtworkUpload
                purpose="inline"
                name={`blocks.${String(i)}.url`}
                pathLabel="Local image path"
                value={b.url}
                change={(url) => {
                  update(i, { url });
                }}
              />
              <Text
                name={`blocks.${String(i)}.alt`}
                label="Image description"
                value={b.alt}
                change={(alt) => {
                  update(i, { alt });
                }}
              />
              <Text
                name={`blocks.${String(i)}.source`}
                label="Image attribution / rights"
                value={b.source}
                change={(source) => {
                  update(i, { source });
                }}
              />
              <Text
                name={`blocks.${String(i)}.text`}
                label="Caption"
                value={b.text}
                change={(text) => {
                  update(i, { text });
                }}
              />
            </>
          )}
          {b.kind === "gallery" && (
            <ImageRowEditor
              images={b.images ?? []}
              path={`blocks.${String(i)}.images`}
              change={(images) => {
                update(i, { images });
              }}
            />
          )}
          {b.kind === "list" && (
            <Text
              label="List items · one per line"
              value={b.items?.join("\n") ?? ""}
              multiline
              change={(v) => {
                update(i, { items: v.split("\n") });
              }}
            />
          )}
          {b.kind === "table" && (
            <>
              <Text
                label="Column headings · one per line"
                value={b.headers?.join("\n") ?? ""}
                multiline
                change={(v) => {
                  update(i, { headers: v.split("\n") });
                }}
              />
              <Text
                label="Table rows · one row per line, cells separated by |"
                help="Each row must have the same number of cells as the headings. A literal | inside a cell is not supported by this editor."
                value={b.rows?.map((row) => row.join("|")).join("\n") ?? ""}
                multiline
                change={(v) => {
                  update(i, {
                    rows: v.split("\n").map((row) => row.split("|")),
                  });
                }}
              />
            </>
          )}
          <div className="catalog-actions">
            <Action
              disabled={value.length >= 100}
              onClick={() => {
                insert(i);
              }}
            >
              Insert {label} before block {i + 1}
            </Action>
            <Action
              disabled={value.length >= 100}
              onClick={() => {
                insert(i + 1);
              }}
            >
              Insert {label} after block {i + 1}
            </Action>
            <Action
              disabled={i === 0}
              onClick={() => {
                const previous = value.at(i - 1);
                if (previous) {
                  setKeys((old) =>
                    old.map((key, index) =>
                      index === i - 1
                        ? (old.at(i) ?? key)
                        : index === i
                          ? (old.at(i - 1) ?? key)
                          : key,
                    ),
                  );
                  change(
                    value.map((item, index) =>
                      index === i - 1 ? b : index === i ? previous : item,
                    ),
                  );
                  focus(i - 1);
                }
              }}
            >
              Move block {i + 1} up
            </Action>
            <Action
              disabled={i === value.length - 1}
              onClick={() => {
                const following = value.at(i + 1);
                if (following) {
                  setKeys((old) =>
                    old.map((key, index) =>
                      index === i + 1
                        ? (old.at(i) ?? key)
                        : index === i
                          ? (old.at(i + 1) ?? key)
                          : key,
                    ),
                  );
                  change(
                    value.map((item, index) =>
                      index === i + 1 ? b : index === i ? following : item,
                    ),
                  );
                  focus(i + 1);
                }
              }}
            >
              Move block {i + 1} down
            </Action>
            <Action
              onClick={() => {
                setKeys((old) => old.filter((_, index) => index !== i));
                change(value.filter((_, index) => index !== i));
                focus(Math.min(i, value.length - 2));
              }}
            >
              Remove block {i + 1}
            </Action>
          </div>
        </fieldset>
      ))}
      <Action
        disabled={value.length >= 100}
        onClick={() => {
          insert(value.length);
        }}
      >
        Add {label}
      </Action>
    </section>
  );
}
