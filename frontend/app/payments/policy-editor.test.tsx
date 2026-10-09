import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import PaymentPolicyEditor from "./policy-editor";
import { emptyRemedies, remedyLabels, type Settings } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const originalScroll = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  vi.clearAllMocks();
  if (originalScroll)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      originalScroll,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
const settings: Settings = {
  version: 1,
  configured: true,
  enabled: false,
  published: null,
  draft: {
    label: "Reviewed terms",
    text: "Explicit payment terms for customers.",
    remedies: {
      ...emptyRemedies,
      ...Object.fromEntries(
        remedyLabels.map(([key]) => [
          key,
          "Reviewed synthetic service remedy terms.",
        ]),
      ),
      dispute_hours: 48,
    },
    currencies: ["USD"],
    routes: [{ code: "usdttrc20", label: "USDT on TRON", network: "trx" }],
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
  },
};
function mount(done = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: "/admin/finance",
        element: <PaymentPolicyEditor settings={settings} done={done} />,
      },
      { path: "/admin/orders", element: <h1>Orders</h1> },
    ],
    { initialEntries: ["/admin/finance?view=policy"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it("publishes only a reviewed saved draft and uses the acknowledged revision despite an older parent value", async () => {
  const draft = { ...settings.draft, label: "New approved terms" };
  vi.mocked(post)
    .mockResolvedValueOnce({ ...settings, version: 2, draft })
    .mockResolvedValueOnce({
      ...settings,
      version: 3,
      draft,
      published: { id: "published", data: draft },
    });
  mount();
  expect(
    screen.queryByRole("button", { name: "Publish payment policy" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Policy title"), {
    target: { value: draft.label },
  });
  expect(
    screen.getByRole("button", { name: "Preview saved payment policy" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Save policy draft" }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Preview saved payment policy" }),
    ).toBeEnabled();
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Preview saved payment policy" }),
  );
  expect(
    screen.getByRole("region", { name: "Saved policy customer preview" }),
  ).toHaveFocus();
  expect(
    screen.getByRole("button", { name: "Publish payment policy" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed these exact saved payment and remedy terms for customers",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Publish payment policy" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual({
    version: 2,
    action: "publish",
    data: draft,
  });
});
it("preserves a failed save and clears publication consent on further edits", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Policy changed"), {
      status: 409,
      code: "payment_conflict",
    }),
  );
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Preview saved payment policy" }),
  );
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed these exact saved payment and remedy terms for customers",
    ),
  );
  fireEvent.change(screen.getByLabelText("Policy title"), {
    target: { value: "Unsaved policy" },
  });
  expect(
    screen.queryByRole("button", { name: "Publish payment policy" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save policy draft" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Policy title")).toHaveValue("Unsaved policy");
  expect(
    screen.getByRole("button", { name: "Check current policy revision" }),
  ).toBeEnabled();
});
it("warns before leaving finance even when the edited policy section is hidden", async () => {
  function Harness() {
    const [active, setActive] = useState(true);
    return (
      <>
        <button
          onClick={() => {
            setActive(false);
          }}
        >
          Other finance section
        </button>
        <PaymentPolicyEditor
          settings={settings}
          done={vi.fn()}
          active={active}
        />
      </>
    );
  }
  const router = createMemoryRouter(
    [
      { path: "/admin/finance", element: <Harness /> },
      { path: "/admin/orders", element: <h1>Orders</h1> },
    ],
    { initialEntries: ["/admin/finance"] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.change(screen.getByLabelText("Policy title"), {
    target: { value: "Draft to retain" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Other finance section" }),
  );
  void router.navigate("/admin/orders");
  expect(
    await screen.findByRole("alert", { name: "Unsaved payment policy" }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Stay with policy draft" }),
  );
  expect(router.state.location.pathname).toBe("/admin/finance");
  void router.navigate("/admin/orders");
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Discard policy draft and leave",
    }),
  );
  await screen.findByRole("heading", { name: "Orders" });
});

it("reports an unavailable outgoing status without inferring it from checkout", () => {
  mount();
  expect(
    screen.getByText(/Outgoing payments: status unavailable/),
  ).toBeVisible();
});

it("explains invalid fields before posting, focuses the first error and preserves the policy draft", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Policy title"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Customer payment policy"), {
    target: { value: "Retain these full customer-facing policy terms." },
  });
  fireEvent.change(screen.getByLabelText("NOWPayments asset code"), {
    target: { value: "USDT_TRC20" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save policy draft" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Policy title")).toHaveFocus();
  });
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("NOWPayments asset code")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    screen.getByLabelText("NOWPayments asset code"),
  ).toHaveAccessibleDescription(/unique NOWPayments asset code/);
  expect(screen.getByLabelText("Customer payment policy")).toHaveValue(
    "Retain these full customer-facing policy terms.",
  );
  expect(
    screen.getByRole("link", {
      name: /NOWPayments asset code: Enter a unique/,
    }),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Policy title"), {
    target: { value: "Corrected policy" },
  });
  expect(screen.getByLabelText("Policy title")).not.toHaveAttribute(
    "aria-invalid",
  );
  expect(screen.getByLabelText("NOWPayments asset code")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
