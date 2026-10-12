import { useState, useId, useContext, useCallback } from "react";
import { FieldValidation, fieldError } from "../ui/form-validation";
import { Check, Select, Text } from "./controls";
import { optionsFor, type Configuration, type Field, type Rule } from "./model";

export default function LinkedChoicesEditor({
  rule,
  fields,
  config,
  path,
  change,
}: {
  rule: Rule;
  fields: Field[];
  config: Configuration;
  path: string;
  change: (patch: Partial<Rule>) => void;
}) {
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const id = useId(),
    name = `${path}.links`;
  const validation = useContext(FieldValidation),
    register = validation?.register;
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && register)
        return register({ name, id, label: "Allowed choices by category" });
    },
    [register, name, id],
  );
  const error = fieldError(validation, name);
  const parentField = fields.find((field) => field.key === rule.from);
  const childField = fields.find((field) => field.key === rule.to);
  const parents = parentField ? optionsFor(parentField, config) : [];
  const children = childField ? optionsFor(childField, config) : [];
  const parent = parents.some((option) => option.key === selected)
    ? selected
    : (parents[0]?.key ?? "");
  const row = rule.links?.find((link) => link.parent === parent);
  const unmapped = children.filter(
    (child) => !rule.links?.some((link) => link.children.includes(child.key)),
  );
  return (
    <fieldset className="catalog-item" aria-invalid={error ? true : undefined}>
      <legend>Allowed choices by category</legend>
      <div
        id={id}
        ref={ref}
        tabIndex={-1}
        role="group"
        aria-label="Mapping coverage"
        aria-describedby={error ? id + "-error" : undefined}
      >
        {error && (
          <p className="field-error" id={id + "-error"}>
            {error}
          </p>
        )}
      </div>
      <p>
        Map regions to servers or roles to heroes explicitly. Customers may
        start with either field; a unique matching category is selected
        automatically.
      </p>
      <Select
        name={`${path}.link_mode`}
        label="Relationship behavior"
        value={rule.link_mode ?? "single_parent"}
        options={[
          ["single_parent", "One parent per choice (region → server)"],
          ["shared_parent", "Shared optional parent (role → heroes)"],
        ]}
        change={(link_mode) => {
          change({
            link_mode:
              link_mode === "shared_parent" ? "shared_parent" : "single_parent",
          });
        }}
      />
      <p className="quiet">
        Use two choice fields at the same form stage. For shared roles, leave
        the role field optional. A field can belong to one relationship.
      </p>
      <Select
        label="Category to configure"
        value={parent}
        change={setSelected}
        options={
          parents.length
            ? parents.map((option) => [option.key, option.label] as const)
            : [["", "Choose the parent field first"]]
        }
      />
      <Text label="Find a child option" value={search} change={setSearch} />
      <div
        className="catalog-choices"
        style={{ maxHeight: "20rem", overflowY: "auto" }}
      >
        {children
          .filter((child) =>
            child.label
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()),
          )
          .map((child) => (
            <Check
              key={child.key}
              label={child.label}
              value={row?.children.includes(child.key) ?? false}
              change={(enabled) => {
                if (!parent) return;
                validation?.correct(name);
                const selectedChildren = enabled
                  ? [...(row?.children ?? []), child.key]
                  : (row?.children ?? []).filter(
                      (value) => value !== child.key,
                    );
                const others = (rule.links ?? []).filter(
                  (link) => link.parent !== parent,
                );
                change({
                  links: selectedChildren.length
                    ? [...others, { parent, children: selectedChildren }]
                    : others,
                });
              }}
            />
          ))}
      </div>
      <p role="status">
        {unmapped.length
          ? `${String(unmapped.length)} choices still need a category.`
          : "All choices have a category."}
      </p>
      <details>
        <summary>Review mappings ({rule.links?.length ?? 0})</summary>
        <ul>
          {rule.links?.map((link) => (
            <li key={link.parent}>
              {parents.find((p) => p.key === link.parent)?.label ??
                `Unavailable option: ${link.parent}`}{" "}
              —{" "}
              {link.children
                .map(
                  (key) =>
                    children.find((c) => c.key === key)?.label ??
                    `Unavailable option: ${key}`,
                )
                .join(", ")}
            </li>
          ))}
        </ul>
      </details>
    </fieldset>
  );
}
