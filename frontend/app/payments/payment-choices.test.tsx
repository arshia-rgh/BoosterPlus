import { paymentRoutes } from "./routes";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import PaymentChoices from "./payment-choices";
import type { PaymentOptions } from "./options";

const routes = [
  { code: "usdtbsc", label: "USDT", network: "BNB Smart Chain" },
  { code: "usdttrc20", label: "USDT", network: "TRON" },
];
const data: PaymentOptions = {
  contract_id: "c",
  policy_id: "p",
  currency: "USD",
  amount_minor: "500",
  server_time: "2026-10-22T00:00:00Z",
  routes: routes.map((v, i) => ({
    code: v.code,
    status: i ? "below_minimum" : "available",
    minimum_crypto: "10",
    minimum_fiat: "10",
    checked_at: "2026-10-22T00:00:00Z",
    valid_until: "2026-10-23T00:00:00Z",
  })),
};
function props() {
  return {
    routes,
    data,
    loading: false,
    error: false,
    route: "",
    change: vi.fn(),
    retry: vi.fn(),
    support: "/orders/order?section=help",
  };
}
it("keeps below-minimum routes visible and disabled with network-specific reasons", () => {
  const p = props();
  render(
    <MemoryRouter>
      <PaymentChoices {...p} />
    </MemoryRouter>,
  );
  expect(screen.getByRole("radio", { name: /TRON/ })).toBeDisabled();
  expect(screen.getByText(/Minimum: 10 USDT/)).toBeVisible();
  fireEvent.click(screen.getByRole("radio", { name: /BNB Smart Chain/ }));
  expect(p.change).toHaveBeenCalledWith("usdtbsc");
});
it.each(["loading", "error", "all-below"])(
  "closes every route for %s without hiding choices",
  (state) => {
    const p = props();
    if (state === "loading") p.loading = true;
    if (state === "error") p.error = true;
    if (state === "all-below")
      p.data = {
        ...data,
        routes: data.routes.map((r) => ({ ...r, status: "below_minimum" })),
      };
    render(
      <MemoryRouter>
        <PaymentChoices {...p} />
      </MemoryRouter>,
    );
    for (const radio of screen.getAllByRole("radio"))
      expect(radio).toBeDisabled();
    if (state !== "loading") {
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(p.retry).toHaveBeenCalledOnce();
      expect(screen.getByRole("link", { name: /Ask support/ })).toHaveAttribute(
        "href",
        p.support,
      );
    }
  },
);

it("searches thirty routes without changing selection or enabling unavailable routes", () => {
  const p = {
    ...props(),
    routes: paymentRoutes.map((route) => ({ ...route, label: route.symbol })),
    route: "usdtbsc",
    data: {
      ...data,
      routes: paymentRoutes.map((r) => ({
        code: r.code,
        minimum_crypto: "10",
        minimum_fiat: "10",
        checked_at: data.server_time,
        valid_until: "2026-10-23T00:00:00Z",
        status:
          r.code === "usdtop"
            ? ("unavailable" as const)
            : ("available" as const),
      })),
    },
  };
  render(
    <MemoryRouter>
      <PaymentChoices {...p} />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("radio")).toHaveLength(30);
  fireEvent.change(screen.getByLabelText("Find a coin or network"), {
    target: { value: "Optimism" },
  });
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  expect(screen.getByRole("radio", { name: /USDT.*Optimism/ })).toBeDisabled();
  expect(screen.getByText("Selected:")).toHaveTextContent(
    "USDT · BNB Smart Chain (BEP20)",
  );
  expect(p.change).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Find a coin or network"), {
    target: { value: "unlisted" },
  });
  expect(screen.getByText("No matching coin or network.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(
    screen.getByRole("radio", { name: /USDT.*BNB Smart Chain/ }),
  ).toBeChecked();
});
