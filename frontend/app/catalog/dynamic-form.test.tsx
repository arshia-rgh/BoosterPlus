import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import DynamicForm from "./dynamic-form";
import {
  emptyConfiguration,
  emptyField,
  emptyVariant,
  type Configuration,
  type Service,
} from "./model";
vi.mock("../identity/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    { ...emptyField("one"), label: "One hero", type: "boolean" },
    {
      ...emptyField("hero"),
      label: "Hero",
      options: [{ key: "alpha", label: "Alpha", units: 0 }],
      visible_when: { op: "eq", field: "one", values: ["true"], children: [] },
      required_when: { op: "eq", field: "one", values: ["true"], children: [] },
    },
    {
      ...emptyField("player"),
      type: "short_text",
      label: "Player ID",
      stage: "fulfillment",
    },
    { ...emptyField("photo"), type: "attachment", label: "Proof" },
  ],
};
const config: Configuration = {
  ...emptyConfiguration("Test game"),
  services: [service],
};
it("renders stages/visibility and submits no hidden stale answers", async () => {
  vi.mocked(post).mockResolvedValue({ answers: { one: false }, issues: [] });
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
    />,
  );
  expect(screen.queryByLabelText("Player ID")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Proof")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "true" },
  });
  fireEvent.change(screen.getByLabelText("Hero (required)"), {
    target: { value: "alpha" },
  });
  fireEvent.change(screen.getByLabelText("One hero"), {
    target: { value: "false" },
  });
  expect(screen.queryByLabelText("Hero (required)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/catalog/games/test/validate",
      expect.objectContaining({
        answers: { one: false },
        release_id: "release",
      }),
      expect.anything(),
    );
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "No order has been created",
  );
});
it("surfaces authoritative field errors and stale releases without a success claim", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({
      answers: {},
      issues: [{ path: "one", message: "Required" }],
    })
    .mockRejectedValueOnce(new APIError("Catalog changed. Reload."));
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="old"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  await waitFor(() =>
    expect(screen.getByLabelText("One hero")).toHaveAttribute(
      "aria-invalid",
      "true",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  expect(await screen.findByText("Catalog changed. Reload.")).toBeVisible();
  expect(screen.queryByText(/Selections are valid/)).not.toBeInTheDocument();
});
it("prevents validation for paused or exhausted offerings", () => {
  render(
    <DynamicForm
      config={config}
      service={service}
      slug="test"
      releaseID="release"
      variant={{ ...emptyVariant("v"), capacity: 0 }}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Check selections" }),
  ).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});
