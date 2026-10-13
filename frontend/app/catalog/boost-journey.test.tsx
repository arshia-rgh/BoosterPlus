import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { ServicePage, PackagePage } from "./public";
import {
  emptyConfiguration,
  emptyField,
  emptyVariant,
  type Release,
} from "./model";
vi.mock("../orders/favorites", () => ({ FavoriteButton: () => null }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const release: Release = {
  id: "r",
  game_id: "g",
  slug: "game",
  version: 1,
  paused: false,
  created_at: "2026-09-27T00:00:00Z",
  configuration: {
    ...emptyConfiguration("Game"),
    services: [
      {
        key: "boost",
        name: "Boost",
        description: "Published scope",
        evaluator: "manual-review-v1",
        rules: [],
        fields: [
          {
            ...emptyField("mode"),
            label: "Play mode",
            required: true,
            options: [
              { key: "duo", label: "Play together", units: 0 },
              { key: "solo", label: "On my account", units: 0 },
            ],
          },
          {
            ...emptyField("note"),
            label: "Instructions",
            type: "short_text",
            stage: "order",
          },
        ],
      },
    ],
  },
};
const button = () =>
  screen.getByRole("button", { name: "Continue to order information →" });
function validated(mode = "duo") {
  vi.mocked(post)
    .mockResolvedValueOnce({ answers: { mode }, issues: [] })
    .mockResolvedValueOnce({
      outcome: "manual_review",
      issues: [],
      lines: [],
      answers: { mode },
      expires_at: "2099-01-01T00:00:00Z",
    });
}
async function setup(path = "/games/game/services/boost") {
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug/services/:service",
        loader: () => release,
        Component: ServicePage,
      },
      { path: "/away", element: <h1>Elsewhere</h1> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByLabelText("Play mode (required)");
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});
it("updates the price beside the choices without changing focus or advancing the request", async () => {
  vi.mocked(post).mockImplementation((path, data) => {
    const input = data as { answers: { mode: string } };
    if (path.endsWith("/validate"))
      return Promise.resolve({ answers: input.answers, issues: [] });
    return Promise.resolve({
      release_id: "r",
      version: 1,
      evaluator: "pricing-v1",
      outcome: "estimated",
      currency: "USD",
      amount_minor: input.answers.mode === "solo" ? "2500" : "3000",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      answers: input.answers,
      lines: [],
      issues: [],
    });
  });
  const router = await setup();
  const choice = screen.getByLabelText("Play mode (required)");
  choice.focus();
  fireEvent.change(choice, { target: { value: "duo" } });
  expect(
    await screen.findByRole("heading", { name: "Estimated price: USD 30.00" }),
  ).toBeVisible();
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("USD 30.00");
  expect(choice).toHaveFocus();
  expect(router.state.location.search).toBe("");
  expect(screen.queryByLabelText("Instructions")).toBeNull();
  fireEvent.change(choice, { target: { value: "solo" } });
  expect(
    screen.queryByRole("heading", { name: "Estimated price: USD 30.00" }),
  ).toBeNull();
  expect(
    await screen.findByRole("heading", { name: "Estimated price: USD 25.00" }),
  ).toBeVisible();
  expect(choice).toHaveFocus();
  fireEvent.click(button());
  await screen.findByLabelText("Instructions");
  expect(post).toHaveBeenCalledWith(
    "/catalog/games/game/validate",
    expect.objectContaining({ answers: { mode: "solo" } }),
    expect.anything(),
  );
  expect(
    screen.getByRole("region", { name: "Price estimate" }),
  ).toHaveTextContent("USD 25.00");
});
it("requires validation before review and preserves private in-memory details through editing", async () => {
  const router = await setup();
  vi.mocked(post).mockResolvedValueOnce({
    answers: {},
    issues: [
      { path: "mode", code: "required", message: "Choose a play mode." },
    ],
  });
  fireEvent.click(button());
  await screen.findByText("Choose a play mode.", { selector: ".field-error" });
  expect(screen.queryByLabelText("Instructions")).toBeNull();
  expect(router.state.location.search).toBe("");
  fireEvent.change(screen.getByLabelText("Play mode (required)"), {
    target: { value: "duo" },
  });
  validated();
  fireEvent.click(button());
  await screen.findByLabelText("Instructions");
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "2. Review & request" }),
    ).toHaveFocus();
  });
  expect(router.state.location.search).toBe("?step=review");
  expect(screen.queryByLabelText("Play mode (required)")).toBeNull();
  expect(
    screen.getByRole("region", { name: "Price estimate" }),
  ).toHaveTextContent("manual price review");
  fireEvent.change(screen.getByLabelText("Instructions"), {
    target: { value: "Private ordinary note" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit choices" }));
  fireEvent.change(await screen.findByLabelText("Play mode (required)"), {
    target: { value: "solo" },
  });
  validated("solo");
  fireEvent.click(button());
  await waitFor(() =>
    expect(screen.getByLabelText("Instructions")).toHaveValue(
      "Private ordinary note",
    ),
  );
  expect(sessionStorage.getItem("playora.configuration")).toBeNull();
  expect(
    screen.getByRole("complementary", { name: "Selection summary" }),
  ).toHaveTextContent("On my account");
});
it("a direct review URL requires current validation and a late response cannot reopen a departed form", async () => {
  const router = await setup("/games/game/services/boost?step=review");
  expect(screen.getByText(/Check your restored selections/)).toBeVisible();
  expect(screen.queryByLabelText("Instructions")).toBeNull();
  let finish: ((value: unknown) => void) | undefined;
  vi.mocked(post).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(button());
  await act(async () => {
    await router.navigate("/away");
  });
  await act(async () => {
    finish?.({ answers: { mode: "duo" }, issues: [] });
    await Promise.resolve();
  });
  expect(screen.getByRole("heading", { name: "Elsewhere" })).toBeVisible();
  expect(post).toHaveBeenCalledTimes(1);
});

it("retired variants require an explicit current selection and preserve history", async () => {
  const current = {
    ...release,
    configuration: {
      ...release.configuration,
      packages: [
        {
          key: "pack",
          name: "Rank package",
          description: "Fixed scope",
          service: "boost",
          variants: [
            {
              ...emptyVariant("solo"),
              name: "Solo package",
              amount_minor: "1000",
              currency: "USD",
            },
            {
              ...emptyVariant("duo"),
              name: "Duo package",
              amount_minor: "2000",
              currency: "USD",
            },
          ],
        },
      ],
    },
  };
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug/packages/:pack",
        loader: () => current,
        Component: PackagePage,
      },
    ],
    {
      initialEntries: ["/games/game/packages/pack?variant=retired&coupon=SAVE"],
    },
  );
  render(<RouterProvider router={router} />);
  const choice = await screen.findByLabelText("Package variant");
  expect(choice).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Continue with this package" }),
  ).toBeNull();
  fireEvent.change(choice, { target: { value: "duo" } });
  await waitFor(() => {
    expect(router.state.location.search).toBe("?variant=duo&coupon=SAVE");
  });
  expect(choice).toHaveValue("duo");
  await act(async () => {
    await router.navigate(-1);
  });
  expect(choice).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Continue with this package" }),
  ).toBeNull();
});
