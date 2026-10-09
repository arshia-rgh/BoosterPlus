import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import AccountDelivery from "./delivery";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("./secret", () => ({
  SecretUpload: () => <p>Protected upload field</p>,
  SecretReveal: () => <p>Protected reveal control</p>,
}));
vi.mock("./market", () => ({ ProductTerms: () => <p>Accepted terms</p> }));
afterEach(() => vi.clearAllMocks());
it.each([false, true])(
  "focuses an explicit handoff success after its refresh, without moving focus on later reads (admin=%s)",
  async (admin) => {
    let loading = false;
    let state = admin ? "pending" : "delivered";
    let error: unknown = null;
    const reload = vi.fn(() => {
      loading = true;
    });
    vi.mocked(useResource).mockImplementation(() => ({
      data: {
        state,
        version: 2,
        secret: { state: "active", version: 1 },
        instructions: "Verify ownership",
        dispute_until: null,
        listing: {},
      },
      loading,
      error,
      reload,
    }));
    vi.mocked(post).mockResolvedValue({});
    const component = () => (
      <MemoryRouter>
        <AccountDelivery id="order" admin={admin} paid changed={vi.fn()} />
      </MemoryRouter>
    );
    const view = render(component());
    fireEvent.change(
      screen.getByLabelText(
        admin ? "Buyer ownership checklist" : "Your acknowledgement note",
      ),
      { target: { value: "Ownership checked and access confirmed." } },
    );
    fireEvent.click(
      screen.getByLabelText(
        admin
          ? "I verified the buyer bundle and ownership checklist"
          : "I received and tested account access and accept the acknowledgement terms",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: admin ? "Deliver account access" : "Acknowledge account received",
      }),
    );
    await waitFor(() => {
      expect(reload).toHaveBeenCalledOnce();
    });
    const result = screen.getByRole("region", {
      name: "Account handoff result",
    });
    expect(result).not.toHaveFocus();
    loading = false;
    state = admin ? "delivered" : "acknowledged";
    // A saved action stays distinguishable from a failed subsequent read.
    error = new Error("Refresh unavailable");
    view.rerender(component());
    await waitFor(() => expect(result).toHaveFocus());
    expect(result).toHaveTextContent(
      admin
        ? "Account access was marked as delivered."
        : "Your receipt acknowledgment was saved.",
    );
    expect(result).toHaveTextContent(
      "The refreshed delivery status is unavailable.",
    );
    const refresh = screen.getByRole("button", {
      name: "Refresh account delivery",
    });
    refresh.focus();
    error = null;
    view.rerender(component());
    expect(refresh).toHaveFocus();
    expect(result).toHaveTextContent(
      "The latest handoff details are shown below.",
    );
    expect(post).toHaveBeenCalledTimes(1);
    error = Object.assign(new APIError("Access removed"), { status: 403 });
    view.rerender(component());
    expect(
      screen.queryByRole("region", { name: "Account handoff result" }),
    ).not.toBeInTheDocument();
  },
);
it.each([false, true])(
  "guides invalid handoff notes before sending (admin=%s)",
  async (admin) => {
    const reload = vi.fn();
    vi.mocked(useResource).mockReturnValue({
      data: {
        state: admin ? "pending" : "delivered",
        version: 1,
        secret: { state: "active", version: 1 },
        instructions: "Verify ownership",
        dispute_until: null,
        listing: {},
      },
      error: null,
      loading: false,
      reload,
    });
    vi.mocked(post).mockResolvedValue({});
    render(
      <MemoryRouter>
        <AccountDelivery id="order" admin={admin} paid changed={vi.fn()} />
      </MemoryRouter>,
    );
    const note = screen.getByLabelText(
      admin ? "Buyer ownership checklist" : "Your acknowledgement note",
    );
    const confirm = screen.getByRole("button", {
      name: admin ? "Deliver account access" : "Acknowledge account received",
    });
    expect(confirm).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        admin
          ? "I verified the buyer bundle and ownership checklist"
          : "I received and tested account access and accept the acknowledgement terms",
      ),
    );
    for (const value of ["Done", "x".repeat(4001), "invalid\0note"]) {
      fireEvent.change(note, { target: { value } });
      fireEvent.click(confirm);
      await waitFor(() => {
        expect(note).toHaveFocus();
      });
      expect(note).toHaveAttribute("aria-invalid", "true");
      expect(note).toHaveAccessibleDescription(/10–4,000/);
      expect(post).not.toHaveBeenCalled();
    }
    fireEvent.change(note, {
      target: { value: "Ownership checked and access confirmed." },
    });
    expect(note).not.toHaveAttribute("aria-invalid");
    fireEvent.click(confirm);
    await waitFor(() => {
      expect(reload).toHaveBeenCalledOnce();
    });
    expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual({
      version: 1,
      secret_version: 1,
      instructions: "Ownership checked and access confirmed.",
      accept: true,
    });
  },
);
it("hides delivery after a denied write and allows fresh input after explicit refresh", async () => {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      state: "delivered",
      version: 1,
      secret: { state: "active", version: 1 },
      instructions: "Verify access",
      dispute_until: null,
      listing: {},
    },
    loading: false,
    error: null,
    reload,
  });
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Access denied"), { status: 403 }),
  );
  render(
    <MemoryRouter>
      <AccountDelivery id="order" admin={false} paid changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Your acknowledgement note"), {
    target: { value: "Ordinary acknowledgement" },
  });
  fireEvent.click(
    screen.getByLabelText(
      "I received and tested account access and accept the acknowledgement terms",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Acknowledge account received" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Your acknowledgement note"),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByText("Protected reveal control"),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh account delivery" }),
  );
  expect(reload).toHaveBeenCalledOnce();
  const note = screen.getByLabelText("Your acknowledgement note");
  expect(note).toHaveValue("");
  fireEvent.change(note, { target: { value: "Fresh acknowledgement" } });
  expect(note).toHaveValue("Fresh acknowledgement");
  expect(
    screen.getByLabelText(
      "I received and tested account access and accept the acknowledgement terms",
    ),
  ).not.toBeChecked();
});
it("preserves an ordinary handoff draft across local hiding while protected inputs unmount", () => {
  const reload = vi.fn(),
    data = {
      state: "pending",
      version: 1,
      secret: { state: "active", version: 1 },
      instructions: "Buyer-visible checklist",
      dispute_until: null,
      listing: {},
    };
  let loading = false;
  vi.mocked(useResource).mockImplementation(() => ({
    data,
    error: null,
    loading,
    reload,
  }));
  const view = (visible: boolean) => (
    <MemoryRouter>
      <AccountDelivery
        id="order"
        admin
        paid
        visible={visible}
        changed={reload}
      />
    </MemoryRouter>
  );
  const rendered = render(view(true));
  fireEvent.change(screen.getByLabelText("Buyer ownership checklist"), {
    target: { value: "Ordinary draft to retain" },
  });
  expect(screen.getByText("Protected upload field")).toBeVisible();
  rendered.rerender(view(false));
  expect(screen.queryByText("Protected upload field")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Buyer ownership checklist")).toHaveValue(
    "Ordinary draft to retain",
  );
  expect(screen.getByLabelText("Buyer ownership checklist")).toBeDisabled();
  rendered.rerender(view(true));
  expect(screen.getByLabelText("Buyer ownership checklist")).toHaveValue(
    "Ordinary draft to retain",
  );
  loading = true;
  rendered.rerender(view(true));
  expect(screen.queryByText("Protected upload field")).not.toBeInTheDocument();
});
it("conceals buyer access when delivery is hidden or payment eligibility changes", () => {
  vi.mocked(useResource).mockReturnValue({
    data: {
      state: "delivered",
      version: 1,
      secret: { version: 1, state: "active" },
      instructions: "Verify access",
      dispute_until: null,
      listing: {},
    },
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  const view = (visible: boolean, paid: boolean) => (
    <MemoryRouter>
      <AccountDelivery
        id="order"
        admin={false}
        visible={visible}
        paid={paid}
        changed={vi.fn()}
      />
    </MemoryRouter>
  );
  const rendered = render(view(true, true));
  expect(screen.getByText("Protected reveal control")).toBeVisible();
  rendered.rerender(view(false, true));
  expect(
    screen.queryByText("Protected reveal control"),
  ).not.toBeInTheDocument();
  rendered.rerender(view(true, false));
  expect(
    screen.queryByText("Protected reveal control"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Report a delivery issue" }),
  ).toHaveAttribute("href", "/?section=help");
});

it("keeps ordinary input for503 but clears it and confirmation for delivery-specific403", () => {
  let error: unknown = null;
  const data = {
    state: "delivered",
    version: 1,
    secret: { version: 1, state: "active" },
    instructions: "Verify access",
    dispute_until: null,
    listing: {},
  };
  vi.mocked(useResource).mockImplementation(() => ({
    data,
    error,
    loading: false,
    reload: vi.fn(),
  }));
  const renderView = () => (
    <MemoryRouter>
      <AccountDelivery id="order" admin={false} paid changed={vi.fn()} />
    </MemoryRouter>
  );
  const view = render(renderView());
  fireEvent.change(screen.getByLabelText("Your acknowledgement note"), {
    target: { value: "Retained ordinary receipt draft" },
  });
  fireEvent.click(
    screen.getByLabelText(
      "I received and tested account access and accept the acknowledgement terms",
    ),
  );
  error = Object.assign(new APIError("Connection interrupted"), {
    status: 503,
  });
  view.rerender(renderView());
  error = null;
  view.rerender(renderView());
  expect(screen.getByLabelText("Your acknowledgement note")).toHaveValue(
    "Retained ordinary receipt draft",
  );
  error = Object.assign(new APIError("Access removed"), { status: 403 });
  view.rerender(renderView());
  error = null;
  view.rerender(renderView());
  expect(screen.getByLabelText("Your acknowledgement note")).toHaveValue("");
  expect(
    screen.getByLabelText(
      "I received and tested account access and accept the acknowledgement terms",
    ),
  ).not.toBeChecked();
});
