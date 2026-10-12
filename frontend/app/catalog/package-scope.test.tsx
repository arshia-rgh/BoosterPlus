import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import DynamicForm from "./dynamic-form";
import PackageScopeEditor, { PackageContents } from "./package-scope";
import {
  packageAnswers,
  packageService,
  packageChoiceState,
} from "./package-fields";
import {
  emptyConfiguration,
  emptyField,
  emptyVariant,
  type Variant,
  type Service,
} from "./model";
import { post } from "../identity/api";
import { FieldValidation, useFormValidation } from "../ui/form-validation";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/submit", () => ({ default: () => <p>Review agreement</p> }));
afterEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});
const service: Service = {
  key: "boost",
  name: "Rank boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    {
      ...emptyField("rank"),
      label: "Target rank",
      required: true,
      options: [{ key: "gold", label: "Gold", units: 0 }],
    },
    {
      ...emptyField("player"),
      label: "Player name",
      stage: "order",
      type: "short_text",
      required: true,
    },
    {
      ...emptyField("custom"),
      label: "Custom extra",
      type: "boolean",
      default: true,
    },
  ],
};
const config = { ...emptyConfiguration("Synthetic"), services: [service] };
const variant: Variant = {
  ...emptyVariant("gold"),
  name: "Gold package",
  preset_answers: { rank: "gold" },
  required_fields: ["player"],
  excluded_fields: ["custom"],
  currency: "USD",
  amount_minor: "1250",
  delivery_min_hours: 12,
  delivery_max_hours: 24,
};

it("shows fixed contents but only asks the customer for approved delivery facts", async () => {
  render(
    <>
      <PackageContents service={service} config={config} variant={variant} />
      <DynamicForm
        service={service}
        config={config}
        variant={variant}
        slug="synthetic"
        releaseID="r"
        stage="order"
        initialAnswers={{ rank: "changed", custom: true }}
      />
    </>,
  );
  expect(
    screen.getByRole("region", { name: "Included in this package" }),
  ).toHaveTextContent("Gold");
  expect(screen.queryByRole("combobox", { name: /Target rank/ })).toBeNull();
  expect(screen.queryByLabelText("Custom extra")).toBeNull();
  fireEvent.change(screen.getByLabelText("Player name (required)"), {
    target: { value: "synthetic-player" },
  });
  vi.mocked(post).mockResolvedValueOnce({
    answers: { rank: "gold", player: "synthetic-player" },
    issues: [],
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continue with this package" }),
  );
  await screen.findByText("Review agreement");
  expect(post).toHaveBeenCalledWith(
    expect.stringContaining("/validate"),
    expect.objectContaining({
      answers: { rank: "gold", player: "synthetic-player" },
      variant: "gold",
    }),
    expect.anything(),
  );
});

it("does not adopt custom defaults or customer attempts to replace fixed contents", () => {
  expect(
    packageService(service, variant).fields.map((field) => field.key),
  ).toEqual(["rank", "player"]);
  expect(
    packageAnswers({ rank: "changed", custom: true, player: "id" }, variant),
  ).toEqual({ rank: "gold", player: "id" });
});

it("keeps legacy incomplete offers unavailable until staff defines their scope", () => {
  const legacy = { ...variant, preset_answers: undefined };
  render(
    <DynamicForm
      service={service}
      config={config}
      variant={legacy}
      slug="synthetic"
      releaseID="r"
      stage="order"
    />,
  );
  expect(
    screen.getByRole("button", { name: "Continue with this package" }),
  ).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});

it("lets the administrator explicitly classify each field and focuses invalid fixed values", async () => {
  let actual: Variant | undefined;
  function Editor() {
    const [value, setValue] = useState(variant);
    const [issues, setIssues] = useState<{ path: string; message: string }[]>(
      [],
    );
    const validation = useFormValidation(issues, () => {
      setIssues([]);
    });
    return (
      <FieldValidation value={validation}>
        <PackageScopeEditor
          service={service}
          config={config}
          variant={value}
          path="packages.0.variants.0"
          change={(patch) => {
            actual = { ...value, ...patch };
            setValue(actual);
          }}
        />
        <button
          onClick={() => {
            setIssues([
              {
                path: "packages.0.variants.0.preset_answers.rank",
                message: "Choose a valid fixed rank.",
              },
            ]);
          }}
        >
          Check
        </button>
      </FieldValidation>
    );
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await waitFor(() => {
    expect(
      screen.getByLabelText("Target rank — fixed value (required)"),
    ).toHaveFocus();
  });
  fireEvent.change(screen.getByLabelText("Custom extra — source"), {
    target: { value: "fixed" },
  });
  expect(actual?.preset_answers).toEqual({ rank: "gold", custom: true });
  expect(actual?.excluded_fields).toEqual([]);
  fireEvent.change(screen.getByLabelText("Custom extra — source"), {
    target: { value: "excluded" },
  });
  expect(actual?.preset_answers).toEqual({ rank: "gold" });
  expect(actual?.excluded_fields).toEqual(["custom"]);
});

it("limits customer categories to the fixed child even for one-parent links", () => {
  const parent = {
    ...emptyField("region"),
    options: [
      { key: "eu", label: "EU", units: 0 },
      { key: "us", label: "US", units: 0 },
    ],
  };
  const linked: Service = {
    ...service,
    fields: [parent, { ...emptyField("server") }],
    rules: [
      {
        key: "map",
        kind: "linked_choices",
        link_mode: "single_parent",
        from: "region",
        to: "server",
        from_units: "",
        to_units: "",
        message: "Match",
        links: [
          { parent: "eu", children: ["server1"] },
          { parent: "us", children: ["server2"] },
        ],
      },
    ],
  };
  const state = packageChoiceState(
    linked,
    config,
    parent,
    { server: "server1" },
    new Set(),
    { ...variant, preset_answers: { server: "server1" } },
  );
  expect(state.options.map((option) => option.key)).toEqual(["eu"]);
  expect(state.restriction).toBeUndefined();
});

it("discloses retired fixed choices and removes only the selected obsolete value", async () => {
  let actual = {
    ...variant,
    preset_answers: {
      rank: "Retired, Rank",
      heroes: ["Retired, Hero", "Mage"],
    },
  };
  const extended: Service = {
    ...service,
    fields: [
      ...service.fields,
      {
        ...emptyField("heroes"),
        label: "Heroes",
        type: "multiselect",
        options: [{ key: "Mage", label: "Mage", units: 0 }],
      },
    ],
  };
  function Editor() {
    const [value, setValue] = useState<Variant>(actual);
    return (
      <PackageScopeEditor
        service={extended}
        config={config}
        variant={value}
        path="packages.0.variants.0"
        change={(patch) => {
          const next = { ...value, ...patch };
          actual = next as typeof actual;
          setValue(next);
        }}
      />
    );
  }
  render(<Editor />);
  expect(
    screen.getByText(/Unavailable fixed value: Retired, Rank/),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Remove unavailable fixed value Retired, Hero",
    }),
  );
  expect(actual.preset_answers.heroes).toEqual(["Mage"]);
  await waitFor(() => {
    expect(screen.getByLabelText("Mage")).toHaveFocus();
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Remove unavailable fixed value Retired, Rank",
    }),
  );
  expect(actual.preset_answers.rank).toBe("");
  await waitFor(() => {
    expect(
      screen.getByLabelText("Target rank — fixed value (required)"),
    ).toHaveFocus();
  });
});
