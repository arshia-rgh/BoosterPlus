import "../../tests/dialog";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { PreparationDialog } from "./preparation-dialog";

afterEach(() => vi.useRealTimers());
function fixture(active = true) {
  const focus = createRef<HTMLHeadingElement>();
  const ui = (next: boolean) => (
    <StrictMode>
      <h2 ref={focus} tabIndex={-1}>
        Payment and receipts
      </h2>
      <PreparationDialog
        active={next}
        returnFocus={focus}
        supportHref="/orders/fixture?section=messages"
      />
    </StrictMode>
  );
  const view = render(ui(active));
  return { ...view, ui, focus };
}
it("opens one branded dialog, focuses its title and restores visible order focus on dismissal", async () => {
  const { ui, rerender, focus } = fixture();
  const modal = screen.getByRole("dialog", {
    name: "Preparing your secure checkout.",
  });
  expect(modal).toBeVisible();
  expect(modal.querySelector("img")).toHaveAttribute(
    "src",
    "/brand/playora-symbol.svg",
  );
  expect(
    screen.getByRole("heading", { name: "Preparing your secure checkout." }),
  ).toHaveFocus();
  fireEvent.click(
    screen.getByRole("button", { name: "View order while we wait" }),
  );
  await waitFor(() => expect(focus.current).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  rerender(ui(false));
  rerender(ui(true));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("lets Escape dismiss preparation without a form submission", async () => {
  const { focus } = fixture();
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true }),
  );
  await waitFor(() => expect(focus.current).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("closes on completion or failure and does not reopen for subsequent polls", async () => {
  const { ui, rerender, focus } = fixture();
  rerender(ui(false));
  await waitFor(() => expect(focus.current).toHaveFocus());
  rerender(ui(true));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("adds an honest delayed explanation and direct order support after fifteen seconds", async () => {
  vi.useFakeTimers();
  fixture();
  expect(screen.queryByText(/taking a little longer/)).not.toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(screen.getByText(/taking a little longer/)).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Contact order support" }),
  ).toHaveAttribute("href", "/orders/fixture?section=messages");
});
it("does not open while inactive", () => {
  fixture(false);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
