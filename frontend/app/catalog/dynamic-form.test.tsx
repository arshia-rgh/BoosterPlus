import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import DynamicForm from "./dynamic-form";
import {
  emptyConfiguration,
  emptyField,
  emptyVariant,
  type Configuration,
  type Service,
} from "./model";
vi.mock("../identity/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => {
  // Discard unused one-shot responses even when an earlier assertion fails.
  vi.resetAllMocks();
  sessionStorage.clear();
});
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    { ...emptyField("one"), label: "One hero", type: "boolean" },
    {
      ...emptyField("hero"),
      label: "Hero",
      options: [{ key: "alpha", label: "Alpha", units: 0 }],
      visible_when: { op: "eq", field: "one", values: ["true"], children: [] },
      required_when: { op: "eq", field: "one", values: ["true"], children: [] },
    },
    {
      ...emptyField("player"),
      type: "short_text",
      label: "Player ID",
      stage: "fulfillment",
    },
    { ...emptyField("photo"), type: "attachment", label: "Proof" },
  ],
};
const config: Configuration = {
  ...emptyConfiguration("Test game"),
  services: [service],
};
it("keeps server-rendered choices disabled until handlers can retain input", () => {
  const form = (
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
    />
  );
  const html = renderToString(form);
  const document = new DOMParser().parseFromString(html, "text/html");
  expect(document.querySelector("fieldset")?.hasAttribute("disabled")).toBe(
    true,
  );
  expect(document.querySelector('[role="status"]')?.textContent).toContain(
    "Preparing your form",
  );
  expect(document.querySelector("noscript")?.textContent).toContain(
    "JavaScript is needed",
  );
  render(form);
  expect(screen.getByLabelText("One hero")).toBeEnabled();
  expect(screen.queryByText("Preparing your form…")).toBeNull();
});
it.each([false, true])(
  "retains current choices when an unrelated draft changes (restored=%s)",
  (restored) => {
    if (restored)
      sessionStorage.setItem(
        "playora.configuration",
        JSON.stringify({
          release: "release",
          service: "boost",
          pack: "",
          variant: "",
          expires: Date.now() + 60000,
          answers: { one: true },
        }),
      );
    render(
      <DynamicForm
        config={config}
        service={service}
        slug="test"
        releaseID="release"
      />,
    );
    fireEvent.change(screen.getByLabelText("One hero"), {
      target: { value: "false" },
    });
    sessionStorage.setItem(
      "playora.configuration",
      JSON.stringify({
        release: "another-release",
        service: "boost",
        pack: "other-package",
        variant: "standard",
        expires: Date.now() + 60000,
        answers: { one: true },
      }),
    );
    fireEvent(
      window,
      new StorageEvent("storage", { key: "playora.configuration" }),
    );
    expect(screen.getByLabelText("One hero")).toHaveValue("false");
    expect(screen.queryByText(/Your saved choices are restored/)).toBeNull();
  },
);
it("renders stages/visibility and submits no hidden stale answers", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { one: false }, issues: [] })
    .mockResolvedValueOnce({
      release_id: "release",
      version: 1,
      evaluator: "manual-review-v1",
      expires_at: "2026-09-10T00:15:00Z",
      outcome: "manual_review",
      currency: "",
      amount_minor: "",
      answers: { one: false },
      issues: [],
      lines: [],
    });
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
    />,
  );
  expect(screen.queryByLabelText("Player ID")).not.toBeInTheDocument();
  expect(
    screen.getByText(
      "Share optional evidence in the order’s messages after submission.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Upload image" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "true" },
  });
  fireEvent.change(screen.getByLabelText("Hero (required)"), {
    target: { value: "alpha" },
  });
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "false" },
  });
  expect(screen.queryByLabelText("Hero (required)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/catalog/games/test/validate",
      expect.objectContaining({
        answers: { one: false },
        release_id: "release",
      }),
      expect.anything(),
    );
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "No order has been created",
  );
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("These selections need a manual price review");
});
it("surfaces authoritative field errors and stale releases without a success claim", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({
      answers: {},
      issues: [{ path: "one", message: "Required" }],
    })
    .mockRejectedValueOnce(new APIError("Catalog changed. Reload."));
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="old"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() => {
    expect(screen.getByLabelText("One hero")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // Focus is applied by an effect after the invalid field is rendered.
    expect(screen.getByLabelText("One hero")).toHaveFocus();
  });
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("Some selections need attention");
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  expect(await screen.findByText("Catalog changed. Reload.")).toBeVisible();
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("We couldn't finish checking");
  expect(screen.queryByText(/Selections are valid/)).not.toBeInTheDocument();
});
it("prevents validation for paused or exhausted offerings", () => {
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
      variant={{ ...emptyVariant("v"), capacity: 0 }}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Continue with this package" }),
  ).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});

it("renders a server estimate and clears it when selections change", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { one: false }, issues: [] })
    .mockResolvedValueOnce({
      release_id: "release",
      version: 1,
      evaluator: "pricing-v1",
      expires_at: "2026-09-10T00:15:00Z",
      outcome: "estimated",
      currency: "USD",
      amount_minor: "301",
      answers: { one: false },
      issues: [],
      lines: [{ key: "base", label: "Base price", amount_minor: "301" }],
    });
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  expect(
    await screen.findByRole("heading", { name: "Estimated price: USD 3.01" }),
  ).toBeVisible();
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("Your provisional estimate is shown here");
  expect(post).toHaveBeenLastCalledWith(
    "/catalog/games/test/estimate",
    { release_id: "release", service: "boost", answers: { one: false } },
    expect.anything(),
  );
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "true" },
  });
  expect(
    screen.queryByRole("heading", { name: /Estimated price/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("Your selections have changed");
});

it("does not retain validation success when pricing detects a stale release", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { one: false }, issues: [] })
    .mockRejectedValueOnce(new APIError("Catalog changed. Reload."));
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="old"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  expect(await screen.findByText("Catalog changed. Reload.")).toBeVisible();
  expect(screen.queryByText(/Selections are valid/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: /Estimated price/ }),
  ).not.toBeInTheDocument();
});

it("checks a coupon against selections without accepting a client price", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { one: false }, issues: [] })
    .mockResolvedValueOnce({
      release_id: "release",
      version: 1,
      evaluator: "pricing-v1",
      expires_at: "2026-09-10T00:15:00Z",
      outcome: "estimated",
      currency: "USD",
      amount_minor: "50",
      answers: { one: false },
      issues: [],
      lines: [],
      discount: {
        coupon_id: "id",
        version: 1,
        code: "SAVE50",
        stage: "estimate",
        amount_minor: "51",
        indicative: true,
      },
    });
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
    />,
  );
  fireEvent.change(screen.getByLabelText("Coupon code (optional)"), {
    target: { value: "SAVE50" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  expect(
    await screen.findByRole("heading", { name: "Estimated price: USD 0.50" }),
  ).toBeVisible();
  expect(post).toHaveBeenLastCalledWith(
    "/catalog/games/test/discount",
    {
      release_id: "release",
      service: "boost",
      answers: { one: false },
      code: "SAVE50",
      stage: "estimate",
      package: "",
      variant: "",
    },
    expect.anything(),
  );
  fireEvent.change(screen.getByLabelText("Coupon code (optional)"), {
    target: { value: "DIFFERENT" },
  });
  expect(
    screen.queryByRole("heading", { name: /Estimated price/ }),
  ).not.toBeInTheDocument();
});

it("preserves choices but invalidates prior validation when changing to order information", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { one: false }, issues: [] })
    .mockResolvedValueOnce({
      outcome: "manual_review",
      currency: "",
      amount_minor: "",
      lines: [],
      issues: [],
      answers: { one: false },
      expires_at: "2026-09-10T00:15:00Z",
    });
  const props = { config, service, slug: "test", releaseID: "release" };
  const view = render(<DynamicForm {...props} stage="estimate" />);
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "false" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await screen.findByText(/Selections are valid/);
  view.rerender(<DynamicForm {...props} stage="order" />);
  expect(screen.getByLabelText("One hero")).toHaveValue("false");
  expect(screen.queryByText(/Selections are valid/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Submit order" }),
  ).not.toBeInTheDocument();
});

it("keeps rejected input, labels errors and focuses a radio group without clearing unrelated errors", async () => {
  const s: Service = {
    ...service,
    fields: [
      {
        ...emptyField("count"),
        type: "integer",
        label: "Requested matches",
        min: "1",
        max: "20",
        step: "1",
      },
      {
        ...emptyField("mode"),
        type: "radio",
        label: "Play method",
        options: [{ key: "together", label: "Play together", units: 0 }],
      },
    ],
  };
  vi.mocked(post).mockResolvedValueOnce({
    answers: {},
    issues: [
      { path: "mode", message: "Choose a play method." },
      { path: "count", message: "Enter a whole number." },
    ],
  });
  render(
    <DynamicForm
      config={{ ...config, services: [s] }}
      service={s}
      slug="test"
      releaseID="release"
    />,
  );
  fireEvent.change(screen.getByLabelText("Requested matches"), {
    target: { value: "not a number" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Requested matches")).toHaveFocus();
  });
  expect(screen.getByLabelText("Requested matches")).toHaveValue(
    "not a number",
  );
  expect(
    screen.getByLabelText("Requested matches"),
  ).toHaveAccessibleDescription(/Enter a whole number/);
  expect(
    screen.getByRole("link", { name: "Play method: Choose a play method." }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("link", { name: "Play method: Choose a play method." }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Play together")).toHaveFocus(),
  );
  fireEvent.click(screen.getByLabelText("Play together"));
  expect(screen.getByLabelText("Requested matches")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

it("requires a fresh explicit win-rate preference before a new submission of a legacy request", async () => {
  const s: Service = {
    ...service,
    fields: [
      {
        ...emptyField("requested_win_rate"),
        type: "decimal",
        label: "Requested win rate",
        unit: "%",
        min: "0",
        max: "100",
        step: "0.1",
      },
    ],
  };
  render(
    <DynamicForm
      config={{ ...config, services: [s] }}
      service={s}
      slug="test"
      releaseID="release"
      initialAnswers={{ requested_win_rate: "75" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Win-rate preference")).toHaveFocus();
  });
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Win-rate preference")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
it.each([
  [
    "range:80:60",
    "Upper win rate (%)",
    "greater than the lower win rate (80%)",
  ],
  ["range::60", "Lower win rate (%)", "lower win rate from 0 to 100"],
  ["range:50:101", "Upper win rate (%)", "upper win rate from 0 to 100"],
  ["below:0", "Below win rate (%)", "greater than 0"],
  ["above:100", "Above win rate (%)", "less than 100"],
])(
  "focuses the incorrect percentage rather than the selected preference (%s)",
  async (initial, label, instruction) => {
    const s: Service = {
      ...service,
      fields: [
        {
          ...emptyField("requested_win_rate"),
          type: "win_rate",
          label: "Requested win rate",
        },
      ],
    };
    render(
      <DynamicForm
        config={{ ...config, services: [s] }}
        service={s}
        slug="test"
        releaseID="release"
        initialAnswers={{ requested_win_rate: initial }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
    const field = screen.getByLabelText(label);
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining(instruction),
    );
    expect(screen.getByLabelText("Win-rate preference")).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(post).not.toHaveBeenCalled();
    // Summary links use the group registration, but resolve its currently invalid bound.
    fireEvent.click(
      screen.getByRole("link", {
        name: /Requested win rate: Choose a win-rate preference/,
      }),
    );
    await waitFor(() => expect(field).toHaveFocus());
    if (initial === "range:80:60") {
      expect(screen.getByLabelText("Lower win rate (%)")).toHaveValue("80");
      expect(screen.getByLabelText("Lower win rate (%)")).not.toHaveAttribute(
        "aria-invalid",
      );
      expect(field).toHaveValue("60");
    }
  },
);
