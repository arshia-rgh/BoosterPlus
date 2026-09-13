import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import AccountOverview from "./overview";

const empty = {
  messages: [],
  more_messages: false,
  attention: [],
  active: [],
  upcoming: [],
  more_attention: false,
  more_active: false,
  more_upcoming: false,
};
const order = {
  id: "owned-order",
  version: 1,
  kind: "custom",
  state: "quoted",
  slug: "mlbb",
  service: "rank",
  package: "",
  variant: "",
  game_name: "Mobile Legends",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
afterEach(() => vi.unstubAllGlobals());
it("shows a useful empty state without fictional wallet or success data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            path.endsWith("/me/overview")
              ? empty
              : { conversations: [], next: "" },
          ),
        ),
      ),
    ),
  );
  render(
    <MemoryRouter>
      <AccountOverview />
    </MemoryRouter>,
  );
  expect(screen.getByText("Loading your work…")).toBeVisible();
  await screen.findByRole("heading", { name: "Ready for your next climb?" });
  expect(
    screen.getByRole("link", { name: "Explore boosting" }),
  ).toHaveAttribute("href", "/games");
  expect(
    screen.queryByText(/wallet|paid successfully/i),
  ).not.toBeInTheDocument();
});
it("distinguishes quote review, active work and proposed sessions", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            path.endsWith("/me/overview")
              ? {
                  ...empty,
                  attention: [order],
                  active: [{ ...order, id: "other", state: "submitted" }],
                  upcoming: [
                    {
                      id: "session",
                      order_id: order.id,
                      state: "proposed",
                      starts_at: "2026-01-01T10:00:00Z",
                      ends_at: "2026-01-01T11:00:00Z",
                      timezone: "UTC",
                    },
                  ],
                }
              : { conversations: [], next: "" },
          ),
        ),
      ),
    ),
  );
  render(
    <MemoryRouter>
      <AccountOverview />
    </MemoryRouter>,
  );
  await screen.findByText("Review your quote");
  expect(screen.getByText("Waiting for our review")).toBeVisible();
  expect(screen.getByText("Proposed · awaiting confirmation")).toBeVisible();
  expect(screen.queryByText("Confirmed session")).not.toBeInTheDocument();
});
it("does not turn unavailable work into an empty account and supports retry", async () => {
  let fail = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      path.endsWith("/me/overview") && fail
        ? Promise.reject(new Error("private database detail"))
        : Promise.resolve(
            new Response(
              JSON.stringify(
                path.endsWith("/me/overview")
                  ? empty
                  : { conversations: [], next: "" },
              ),
            ),
          ),
    ),
  );
  render(
    <MemoryRouter>
      <AccountOverview />
    </MemoryRouter>,
  );
  await screen.findByText(
    "Your work is unavailable. Refresh overview to try again.",
  );
  expect(
    screen.queryByRole("heading", { name: "Ready for your next climb?" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/private database/)).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
  await screen.findByRole("heading", { name: "Ready for your next climb?" });
});
it("discards an old account's delayed result after identity remount", async () => {
  let finish: ((value: Response) => void) | undefined;
  let first = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      if (path.endsWith("/me/overview") && first) {
        first = false;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }
      return Promise.resolve(
        new Response(
          JSON.stringify(
            path.endsWith("/me/overview")
              ? empty
              : { conversations: [], next: "" },
          ),
        ),
      );
    }),
  );
  const view = render(
    <MemoryRouter>
      <AccountOverview key="first" />
    </MemoryRouter>,
  );
  view.rerender(
    <MemoryRouter>
      <AccountOverview key="second" />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Ready for your next climb?" });
  finish?.(
    new Response(
      JSON.stringify({
        ...empty,
        attention: [{ ...order, game_name: "Private previous account" }],
      }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Private previous account"),
    ).not.toBeInTheDocument(),
  );
});
