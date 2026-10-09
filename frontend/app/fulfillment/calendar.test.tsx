import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { BoosterCalendar } from "./calendar";
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
});
