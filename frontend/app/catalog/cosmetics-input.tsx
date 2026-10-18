import { useRef, useState } from "react";
import { Action, Select, Text } from "./controls";
import {
  cosmeticsSchema,
  optionsFor,
  type Answers,
  type Configuration,
  type Field,
  type Cosmetics,
} from "./model";

export default function CosmeticsInput({
  field,
  config,
  value,
  change,
  name,
  label,
  describedBy,
  invalid,
  publicReview = false,
}: {
  field: Field;
  config: Configuration;
  value: Answers[string] | undefined;
  change: (value: Answers[string]) => void;
  name: string;
  label: string;
  describedBy?: string | undefined;
  invalid: boolean;
  publicReview?: boolean;
}) {
  const groups = cosmeticsSchema.safeParse(value).data?.groups ?? [];
  const [keys, setKeys] = useState(() => groups.map((_, i) => String(i)));
  const sequence = useRef(groups.length),
    root = useRef<HTMLFieldSetElement>(null);
  function update(index: number, patch: Partial<Cosmetics["groups"][number]>) {
    change({
      groups: groups.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  }
  function focus(index: number) {
    requestAnimationFrame(() => {
      (
        root.current?.querySelector<HTMLElement>(
          `[data-skin-row="${String(index)}"] ${publicReview ? "input" : "select"}`,
        ) ?? root.current?.querySelector<HTMLElement>("[data-add-skin]")
      )?.focus();
    });
  }
  return (
    <fieldset
      ref={root}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="cosmetic-collection"
    >
      <legend>{label}</legend>
      <p>
        Group skins by category. Enter the quantity and name each skin or its
        associated hero on a separate line. Your names must match the quantity.{" "}
        {publicReview
          ? "These reviewed details will be public after publication."
          : "This is private review information."}
      </p>
      {groups.map((group, i) => (
        <fieldset
          className="catalog-item"
          key={keys.at(i) ?? String(i)}
          data-skin-row={i}
        >
          <legend>Skin group {i + 1}</legend>
          {publicReview ? (
            <Text
              name={`${name}.groups.${String(i)}.category`}
              label={`Skin category ${String(i + 1)}`}
              value={group.category}
              change={(category) => {
                update(i, { category });
              }}
            />
          ) : (
            <Select
              name={`${name}.groups.${String(i)}.category`}
              label={`Skin category ${String(i + 1)}`}
              value={group.category}
              options={[
                ["", "Choose a category"],
                ...optionsFor(field, config).map(
                  (option) => [option.key, option.label] as const,
                ),
                ...(group.category &&
                !optionsFor(field, config).some(
                  (option) => option.key === group.category,
                )
                  ? [
                      [
                        group.category,
                        `Unavailable: ${group.category}`,
                      ] as const,
                    ]
                  : []),
              ]}
              change={(category) => {
                update(i, { category });
              }}
            />
          )}
          <Text
            name={`${name}.groups.${String(i)}.count`}
            label={`Quantity in group ${String(i + 1)}`}
            inputMode="numeric"
            value={group.count}
            change={(count) => {
              update(i, { count });
            }}
            help="1–500. This must equal the number of names below."
          />
          <Text
            name={`${name}.groups.${String(i)}.names`}
            label={`Skin or hero names in group ${String(i + 1)}`}
            multiline
            value={group.names.join("\n")}
            change={(names) => {
              update(i, { names: names.split("\n") });
            }}
            help="One item per line; up to 120 characters each. Use the skin name or its associated character so staff can verify the collection."
          />
          <Action
            onClick={() => {
              setKeys((old) => old.filter((_, index) => index !== i));
              change({ groups: groups.filter((_, index) => index !== i) });
              focus(Math.min(i, groups.length - 2));
            }}
          >
            Remove skin group {i + 1}
          </Action>
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        data-add-skin
        aria-describedby={describedBy}
        disabled={groups.length >= 60}
        onClick={() => {
          setKeys((old) => [...old, String(sequence.current++)]);
          change({
            groups: [...groups, { category: "", count: "", names: [] }],
          });
          focus(groups.length);
        }}
      >
        Add skin group
      </button>
    </fieldset>
  );
}
