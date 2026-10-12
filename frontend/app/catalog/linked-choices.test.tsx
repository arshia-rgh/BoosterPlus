import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { ConditionEditor, OptionsEditor } from "./controls";
import { changeLinkedChoice, linkedChoiceState } from "./linked-choices";
import {
  emptyConfiguration,
  emptyField,
  type Answers,
  type Service,
  type Condition,
  type Field,
} from "./model";
import DynamicForm, { Input } from "./dynamic-form";
import { saveConfigurationDraft } from "./configuration-draft";
import LinkedChoicesEditor from "./linked-choices-editor";
import { FieldEditor } from "./editor-parts";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
afterEach(() => {
  sessionStorage.clear();
});

it("edits multiselect defaults without splitting readable option names", () => {
  let actual: Field | undefined;
  function Editor() {
    const [field, setField] = useState<Field>({
      ...emptyField("region"),
      type: "multiselect",
      options: [
        { key: "Europe, West", label: "Europe, West", units: 0 },
        { key: "中路", label: "中路", units: 0 },
      ],
      default: ["Europe, West"],
    });
    return (
      <FieldEditor
        field={field}
        service={service}
        config={config}
        change={(patch) => {
          actual = { ...field, ...patch };
          setField({ ...field, ...patch });
        }}
      />
    );
  }
  render(<Editor />);
  const defaults = within(
    screen.getByRole("group", { name: "Default answer" }),
  );
  expect(
    defaults.getByRole("checkbox", { name: "Europe, West" }),
  ).toBeChecked();
  fireEvent.click(defaults.getByRole("checkbox", { name: "中路" }));
  expect(actual?.default).toEqual(["Europe, West", "中路"]);
  fireEvent.click(defaults.getByRole("checkbox", { name: "Europe, West" }));
  expect(actual?.default).toEqual(["中路"]);
});

it.each(["select", "rank", "radio"] as const)(
  "reveals and removes an unavailable %s default without hiding its stored value",
  async (type) => {
    function Editor() {
      const [field, setField] = useState<Field>({
        ...emptyField("region"),
        type,
        options: [{ key: "EU", label: "Europe", units: 0 }],
        default: "Retired, Region",
      });
      return (
        <FieldEditor
          field={field}
          service={service}
          config={config}
          change={(patch) => {
            setField({ ...field, ...patch });
          }}
        />
      );
    }
    render(<Editor />);
    expect(
      screen.getByText(/Unavailable default: Retired, Region/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove unavailable default Retired, Region",
      }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Use a default")).toHaveFocus();
    });
    expect(screen.getByLabelText("Use a default")).not.toBeChecked();
    expect(screen.queryByText(/Unavailable default:/)).not.toBeInTheDocument();
  },
);

it("keeps punctuation in exact option values and uses separate membership inputs", () => {
  let actual: Condition | undefined;
  function Editor() {
    const [condition, setCondition] = useState<Condition | undefined>({
      op: "eq",
      field: "region",
      values: ["Europe, West"],
      children: [],
    });
    return (
      <ConditionEditor
        label="Availability"
        fields={[emptyField("region")]}
        value={condition}
        change={(next) => {
          actual = next;
          setCondition(next);
        }}
      />
    );
  }
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Condition values"), {
    target: { value: "Mid lane, mage" },
  });
  expect(actual?.values).toEqual(["Mid lane, mage"]);
  fireEvent.change(screen.getByLabelText("Condition operator"), {
    target: { value: "in" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add condition value" }));
  fireEvent.change(screen.getByLabelText("Condition value 2"), {
    target: { value: "中路" },
  });
  expect(actual?.values).toEqual(["Mid lane, mage", "中路"]);
  fireEvent.click(
    screen.getByRole("button", { name: "Remove condition value 1" }),
  );
  expect(actual?.values).toEqual(["中路"]);
});

const option = (key: string) => ({ key, label: key, units: 0 });
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  fields: [
    {
      ...emptyField("role"),
      label: "Role",
      type: "select",
      options: [option("Mid lane"), option("Roaming")],
    },
    {
      ...emptyField("heroes"),
      label: "Heroes",
      type: "multiselect",
      max_selections: 3,
      options: [option("Mage"), option("Tank"), option("Flexible")],
    },
  ],
  rules: [
    {
      key: "roles",
      kind: "linked_choices",
      link_mode: "shared_parent",
      from: "role",
      to: "heroes",
      from_units: "",
      to_units: "",
      message: "Choose compatible heroes and role.",
      links: [
        { parent: "Mid lane", children: ["Mage", "Flexible"] },
        { parent: "Roaming", children: ["Tank", "Flexible"] },
      ],
    },
  ],
};
function firstRule() {
  const rule = service.rules[0];
  if (!rule) throw new Error("Missing fixture rule");
  return rule;
}
const config = { ...emptyConfiguration("Game"), services: [service] };
function Choices() {
  const [values, setValues] = useState<Answers>({});
  const [automatic, setAutomatic] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState("");
  return (
    <>
      <p role="status">{notice}</p>
      {service.fields.map((field) => (
        <Input
          key={field.key}
          field={field}
          config={config}
          value={values[field.key]}
          required={false}
          error={undefined}
          choiceState={linkedChoiceState(
            service,
            config,
            field,
            values,
            automatic,
          )}
          change={(value) => {
            const next = changeLinkedChoice(
              service,
              values,
              field.key,
              value,
              automatic,
            );
            setValues(next.answers);
            setAutomatic(next.automatic);
            setNotice(next.notice);
          }}
        />
      ))}
    </>
  );
}

it("allows hero-first choices across roles, auto-matches a shared role and restores it after clearing", () => {
  render(<Choices />);
  fireEvent.click(screen.getByLabelText("Mage"));
  expect(screen.getByLabelText("Role")).toHaveValue("Mid lane");
  expect(screen.getByLabelText("Tank")).toBeVisible();
  fireEvent.click(screen.getByLabelText("Tank"));
  expect(screen.getByLabelText("Role")).toBeDisabled();
  expect(screen.getByLabelText("Role")).toHaveValue("");
  fireEvent.click(screen.getByLabelText("Tank"));
  expect(screen.getByLabelText("Role")).toBeEnabled();
  expect(screen.getByLabelText("Role")).toHaveValue("Mid lane");
  fireEvent.click(screen.getByLabelText("Mage"));
  expect(screen.getByLabelText("Role")).toHaveValue("");
});

it("filters after an explicit role choice and explains incompatible choices removed on role change", () => {
  render(<Choices />);
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Mid lane" },
  });
  expect(screen.queryByLabelText("Tank")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Mage"));
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Roaming" },
  });
  expect(screen.queryByLabelText("Mage")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Tank")).not.toBeChecked();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Incompatible selections were removed",
  );
});

it("does not guess when a hero has multiple shared roles", () => {
  render(<Choices />);
  fireEvent.click(screen.getByLabelText("Flexible"));
  expect(screen.getByLabelText("Role")).toHaveValue("");
  expect(screen.getByLabelText("Role")).toBeEnabled();
});

it("chooses a server's unique region and removes it when a different region is selected", () => {
  const region: Service = {
    ...service,
    rules: [
      {
        ...firstRule(),
        from: "region",
        to: "server",
        link_mode: "single_parent",
        links: [
          { parent: "Europe", children: ["EU 1"] },
          { parent: "Asia", children: ["Asia 1"] },
        ],
      },
    ],
    fields: [
      {
        ...emptyField("region"),
        type: "select",
        options: [option("Europe"), option("Asia")],
      },
      {
        ...emptyField("server"),
        type: "select",
        options: [option("EU 1"), option("Asia 1")],
      },
    ],
  };
  const first = changeLinkedChoice(region, {}, "server", "EU 1", new Set());
  expect(first.answers).toEqual({ server: "EU 1", region: "Europe" });
  expect(
    linkedChoiceState(
      region,
      config,
      region.fields[1] ?? emptyField("missing"),
      first.answers,
      first.automatic,
    ).options,
  ).toEqual([option("EU 1")]);
  const second = changeLinkedChoice(
    region,
    first.answers,
    "region",
    "Asia",
    first.automatic,
  );
  expect(second.answers).toEqual({ region: "Asia" });
  expect(second.notice).toMatch(/Incompatible/);
});

it("uses an option label verbatim only on request and prevents duplicate keys", () => {
  function Editor() {
    const [options, setOptions] = useState([
      { key: "old", label: "Mid lane", units: 0 },
      { key: "other", label: "Mid lane", units: 0 },
    ]);
    return <OptionsEditor options={options} change={setOptions} />;
  }
  render(<Editor />);
  const first = within(screen.getByRole("group", { name: "Option 1" }));
  fireEvent.click(
    first.getByRole("button", { name: "Use label as option key" }),
  );
  expect(first.getByLabelText("Option key")).toHaveValue("Mid lane");
  const second = within(screen.getByRole("group", { name: "Option 2" }));
  expect(
    second.getByRole("button", { name: "Use label as option key" }),
  ).toBeDisabled();
  fireEvent.change(first.getByLabelText("Option label"), {
    target: { value: "Middle lane" },
  });
  expect(first.getByLabelText("Option key")).toHaveValue("Mid lane");
});

it("clearing an explicit role returns to inferred behavior without losing a server-required match", () => {
  render(<Choices />);
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Mid lane" },
  });
  fireEvent.click(screen.getByLabelText("Mage"));
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "" } });
  expect(screen.getByLabelText("Role")).toHaveValue("Mid lane");
  expect(screen.getByLabelText("Tank")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(
    "choose across categories",
  );
  fireEvent.click(screen.getByLabelText("Tank"));
  expect(screen.getByLabelText("Role")).toHaveValue("");
  expect(screen.getByLabelText("Role")).toBeDisabled();
});

it.each([false, true])(
  "restores explicit vs inferred role filtering across the sign-in draft (inferred=%s)",
  (inferred) => {
    saveConfigurationDraft(
      "release",
      service,
      config,
      "",
      "",
      { role: "Mid lane", heroes: ["Mage"] },
      new Set(inferred ? ["role"] : []),
    );
    render(
      <DynamicForm
        service={service}
        config={config}
        releaseID="release"
        slug="game"
      />,
    );
    expect(screen.getByLabelText("Role")).toHaveValue("Mid lane");
    expect(screen.getByLabelText("Mage")).toBeChecked();
    if (inferred) expect(screen.getByLabelText("Tank")).toBeVisible();
    else expect(screen.queryByLabelText("Tank")).not.toBeInTheDocument();
  },
);

it("restores server answers without silently turning their matched role into an editor filter", () => {
  render(
    <DynamicForm
      service={service}
      config={config}
      releaseID="release"
      slug="game"
      initialAnswers={{ role: "Mid lane", heroes: ["Mage"] }}
    />,
  );
  expect(screen.getByLabelText("Tank")).toBeVisible();
  expect(screen.getByText(/Saved categories match your choices/)).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Limit Heroes to Mid lane" }),
  );
  expect(screen.queryByLabelText("Tank")).not.toBeInTheDocument();
});

it.each([
  "Map every child to a parent.",
  "Single-parent mode requires exactly one parent per child.",
])(
  "focuses and explains a mapping error in a collapsed rule: %s",
  async (message) => {
    function Editor() {
      const [issues, setIssues] = useState<FieldIssue[]>([]);
      const [rule, setRule] = useState(firstRule());
      const validation = useFormValidation(issues, () => {
        setIssues([]);
      });
      return (
        <FieldValidation value={validation}>
          <button
            onClick={() => {
              setIssues([{ path: "services.0.rules.0.links", message }]);
            }}
          >
            Validate draft
          </button>
          <details>
            <summary>Role relationship</summary>
            <LinkedChoicesEditor
              rule={rule}
              fields={service.fields}
              config={config}
              path="services.0.rules.0"
              change={(patch) => {
                setRule({ ...rule, ...patch });
              }}
            />
          </details>
        </FieldValidation>
      );
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Validate draft" }));
    const group = screen.getByRole("group", {
      name: "Mapping coverage",
      hidden: true,
    });
    await waitFor(() => expect(group).toHaveFocus());
    expect(group.closest("fieldset")).toHaveAttribute("aria-invalid", "true");
    expect(
      document.getElementById(
        group.getAttribute("aria-describedby") ?? "missing",
      ),
    ).toHaveTextContent(message);
    expect(group.closest("details")).toHaveAttribute("open");
  },
);
