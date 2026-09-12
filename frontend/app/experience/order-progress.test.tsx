import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import OrderProgress from "./order-progress";
import { states, type Detail } from "../orders/model";
// These are the only fields read by the presentation component.
const detail = (state: Detail["order"]["state"], payment?: string) =>
  ({
    order: { state },
    ...(payment ? { contract: { payment_state: payment } } : {}),
  }) as Detail;
for (const state of states) {
  it(`offers guidance for ${state} without an invented payment state`, () => {
    const { container } = render(<OrderProgress detail={detail(state)} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
    if (["rejected", "cancelled", "expired"].includes(state))
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    else if (state !== "completed")
      expect(
        container.querySelector('[aria-current="step"]'),
      ).toHaveTextContent("Request received");
  });
}
it("keeps unpaid agreement progress before paid fulfillment", () => {
  const view = render(
    <OrderProgress detail={detail("awaiting_payment", "unpaid")} />,
  );
  expect(
    view.container.querySelector('[aria-current="step"]'),
  ).toHaveTextContent("Review agreement");
  expect(screen.getByText(/Payment has not been verified/)).toBeVisible();
  view.rerender(<OrderProgress detail={detail("queued", "settled")} />);
  expect(
    view.container.querySelector('[aria-current="step"]'),
  ).toHaveTextContent("Paid · fulfillment");
});
