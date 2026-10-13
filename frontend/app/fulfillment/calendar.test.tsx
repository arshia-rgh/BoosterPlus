import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { AdminCalendar, BoosterCalendar } from "./calendar";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("./agenda", () => ({ default: () => null }));
afterEach(() => vi.clearAllMocks());
function setup() {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      profile: {
        version: 1,
        timezone: "UTC",
        enabled: false,
        game_tags: ["mlbb"],
        region_tags: ["global"],
      },
      windows: [],
      next: "",
    },
    loading: false,
    error: null,
    reload,
  });
  render(<BoosterCalendar />);
  return reload;
}
it("guides invalid calendar timezone and tags without losing the draft", async () => {
  const reload = setup();
  const zone = screen.getByLabelText("Calendar time zone (IANA)");
  const games = screen.getByLabelText("Game capabilities (comma separated)");
  const save = screen.getByRole("button", { name: "Save calendar profile" });
  fireEvent.change(zone, { target: { value: "Not/AZone" } });
  fireEvent.change(games, { target: { value: "mlbb, wow" } });
  fireEvent.click(save);
  await waitFor(() => expect(zone).toHaveFocus());
  expect(zone).toHaveAttribute("aria-invalid", "true");
  expect(zone).toHaveAccessibleDescription(
    expect.stringContaining("IANA time zone"),
  );
  expect(games).toHaveValue("mlbb, wow");
  expect(post).not.toHaveBeenCalled();
  fireEvent.change(zone, { target: { value: "Europe/London" } });
  fireEvent.change(games, { target: { value: "mlbb, mlbb" } });
  fireEvent.click(save);
  await waitFor(() => expect(games).toHaveFocus());
  expect(games).toHaveAccessibleDescription(
    expect.stringContaining("12 different tags"),
  );
  vi.mocked(post).mockResolvedValue({});
  fireEvent.change(games, { target: { value: "mlbb, wow" } });
  fireEvent.click(save);
  await waitFor(() => {
    expect(reload).toHaveBeenCalledTimes(1);
  });
  expect(post).toHaveBeenCalledWith(
    "/booster/calendar",
    {
      version: 1,
      timezone: "Europe/London",
      enabled: false,
      game_tags: ["mlbb", "wow"],
      region_tags: ["global"],
    },
    expect.anything(),
  );
});
it("associates server profile issues without discarding a timezone draft", async () => {
  setup();
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Check calendar"), {
      status: 422,
      issues: [{ path: "timezone", message: "Review the calendar time zone." }],
    }),
  );
  const zone = screen.getByLabelText("Calendar time zone (IANA)");
  fireEvent.change(zone, { target: { value: "Asia/Tehran" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Save calendar profile" }),
  );
  await waitFor(() => expect(zone).toHaveFocus());
  expect(zone).toHaveValue("Asia/Tehran");
  expect(zone).toHaveAccessibleDescription(
    expect.stringContaining("Review the calendar time zone."),
  );
  expect(screen.queryByText("Calendar profile saved.")).not.toBeInTheDocument();
});
it.each([false, true])(
  "announces a saved profile across refresh and restores only lost focus (admin=%s)",
  async (admin) => {
    let loading = false;
    const data = {
      profile: {
        version: 1,
        timezone: "UTC",
        enabled: false,
        game_tags: ["mlbb"],
        region_tags: ["global"],
      },
      windows: [],
      next: "",
    };
    const reload = vi.fn(() => {
      loading = true;
    });
    vi.mocked(useResource).mockImplementation((path) =>
      path === "/admin/fulfillment/staff"
        ? {
            data: {
              staff: [
                { id: "staff", alias: "Synthetic booster", role: "booster" },
              ],
            },
            error: null,
            loading: false,
            reload: vi.fn(),
          }
        : { data, error: null, loading, reload },
    );
    const component = () => (admin ? <AdminCalendar /> : <BoosterCalendar />);
    const view = render(component());
    if (admin)
      fireEvent.change(screen.getByLabelText("Staff calendar to manage"), {
        target: { value: "staff" },
      });
    vi.mocked(post).mockResolvedValue(data.profile);
    const save = screen.getByRole("button", { name: "Save calendar profile" });
    save.focus();
    fireEvent.click(save);
    await waitFor(() => {
      expect(reload).toHaveBeenCalledOnce();
    });
    expect(screen.getByText("Calendar profile saved.")).toBeVisible();
    data.profile.version = 2;
    loading = false;
    view.rerender(component());
    const result = screen.getByRole("region", {
      name: "Calendar profile result",
    });
    await waitFor(() => expect(result).toHaveFocus());
    const refresh = screen.getByRole("button", { name: "Refresh calendar" });
    refresh.focus();
    view.rerender(component());
    expect(refresh).toHaveFocus();
    let resolveSave: (() => void) | undefined;
    vi.mocked(post).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = () => {
          resolve(data.profile);
        };
      }),
    );
    const secondSave = screen.getByRole("button", {
      name: "Save calendar profile",
    });
    secondSave.focus();
    fireEvent.click(secondSave);
    refresh.focus();
    await act(async () => {
      resolveSave?.();
      await Promise.resolve();
    });
    data.profile.version = 3;
    loading = false;
    view.rerender(component());
    expect(refresh).toHaveFocus();
    expect(screen.getByText("Calendar profile saved.")).toBeVisible();
    const zone = screen.getByLabelText("Calendar time zone (IANA)");
    fireEvent.change(zone, { target: { value: "Not/AZone" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save calendar profile" }),
    );
    await waitFor(() => expect(zone).toHaveFocus());
    expect(
      screen.queryByText("Calendar profile saved."),
    ).not.toBeInTheDocument();
    fireEvent.change(zone, { target: { value: "UTC" } });
    vi.mocked(post).mockRejectedValueOnce(
      new Error("Synthetic service failure"),
    );
    const retry = screen.getByRole("button", { name: "Save calendar profile" });
    retry.focus();
    fireEvent.click(retry);
    await screen.findByText("The service is unavailable. Please try again.");
    expect(retry).toHaveFocus();
    expect(
      screen.queryByText("Calendar profile saved."),
    ).not.toBeInTheDocument();
  },
);
