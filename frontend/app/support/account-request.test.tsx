import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get, post } from "../identity/api";
import { portalReturn } from "../identity/portal";
import NewSupport from "./new";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
});
const release = { configuration: { name: "Mobile Legends" } };
function start(query: string) {
  Element.prototype.scrollIntoView = vi.fn();
  return render(
    <MemoryRouter initialEntries={["/support" + query]}>
      <NewSupport />
    </MemoryRouter>,
  );
}

it("opens a game account request with the published name and sends its slug", async () => {
  vi.mocked(get).mockResolvedValue(release);
  vi.mocked(post).mockResolvedValue({ id: "thread" });
  start("?account_request=mobile-legends");
  const subject = await screen.findByLabelText("Conversation subject");
  expect(get).toHaveBeenCalledWith(
    "/catalog/games/mobile-legends",
    expect.anything(),
    "customer",
  );
  expect(subject).toHaveValue("Account request — Mobile Legends");
  await waitFor(() => expect(subject).toHaveFocus());
  expect(
    screen.getByRole("group", { name: "Request an account" }),
  ).toBeVisible();
  expect(
    screen.getByText(
      "Next, describe the account you want in the chat. Don’t share passwords or codes.",
    ),
  ).toBeVisible();
  expect(screen.queryByText(/Questions before you order/)).toBeNull();
  expect(screen.queryByText(/use its Messages tab/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(1);
  });
  expect(vi.mocked(post).mock.calls[0]?.[1]).toMatchObject({
    kind: "presales",
    subject: "Account request — Mobile Legends",
    slug: "mobile-legends",
  });
});

for (const [name, query, read] of [
  [
    "an unknown game",
    "?account_request=unknown-game",
    () => Promise.reject(new Error("not found")),
  ],
  [
    "crafted text",
    "?account_request=%3Cscript%3E",
    () => Promise.resolve(release),
  ],
] as const)
  it(`falls back to the ordinary start for ${name}`, async () => {
    vi.mocked(get).mockImplementation(read);
    vi.mocked(post).mockResolvedValue({ id: "thread" });
    start(query);
    const subject = await screen.findByLabelText("Conversation subject");
    expect(subject).toHaveValue("");
    expect(
      screen.getByRole("group", { name: "Start a conversation" }),
    ).toBeVisible();
    expect(screen.getByText(/Questions before you order/)).toBeVisible();
    expect(document.body.textContent).not.toContain("script");
    fireEvent.change(subject, { target: { value: "A question" } });
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await waitFor(() => {
      expect(post).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(post).mock.calls[0]?.[1]).toMatchObject({ slug: "" });
  });

it("keeps a game account request across sign-in and drops anything else", () => {
  expect(
    portalReturn("/support?account_request=mobile-legends&x=1", "customer"),
  ).toBe("/support?account_request=mobile-legends");
  expect(
    portalReturn("/support?account_request=%3Cscript%3E", "customer"),
  ).toBe("/support");
  expect(
    portalReturn("/support?account_request=mobile-legends", "admin"),
  ).toBeNull();
});
