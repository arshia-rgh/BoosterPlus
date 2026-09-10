import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { emptyConfiguration, emptyField } from "../catalog/model";
import SubmissionEditor from "./form";
import type { Submission } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
function fixture(): Submission {
  const config = emptyConfiguration("Synthetic game");
  config.intake = {
    name: "Ownership review",
    description: "Ordinary attributes only",
    fields: [
      {
        ...emptyField("region"),
        key: "region",
        label: "Region",
        stage: "order",
        required: true,
      },
    ],
    rules: [],
  };
  return {
    submission: {
      id: "submission",
      version: 4,
      title: "Private account",
      game: "Synthetic game",
      state: "draft",
      created_at: "2026-09-10T00:00:00Z",
      updated_at: "2026-09-10T00:00:00Z",
    },
    offer: {
      id: "release",
      game_id: "game",
      slug: "game",
      version: 1,
      configuration: config,
      paused: false,
      created_at: "2026-09-10T00:00:00Z",
    },
    answers: {},
    ownership_notes: "",
    ownership_declared: false,
    note: "Draft",
    conversation_id: "thread",
  };
}
it("keeps edits private until explicitly saved and forbids submitting unsaved changes", async () => {
  const value = fixture(),
    reload = vi.fn();
  vi.mocked(post).mockResolvedValue(value);
  render(<SubmissionEditor value={value} reload={reload} />);
  const submit = screen.getByRole("button", {
    name: "Submit saved account for review",
  });
  fireEvent.change(screen.getByLabelText("Private account title"), {
    target: { value: "Edited private title" },
  });
  expect(submit).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenCalledWith(
    "/submissions/submission/edit",
    expect.objectContaining({
      version: 4,
      title: "Edited private title",
      ownership_declared: false,
    }),
    expect.anything(),
  );
});
it("retains unsaved input on a conflict and never retries with an invented version", async () => {
  const reload = vi.fn();
  vi.mocked(post).mockRejectedValue(
    new APIError("Refresh the changed submission."),
  );
  render(<SubmissionEditor value={fixture()} reload={reload} />);
  fireEvent.change(screen.getByLabelText("Ownership and control information"), {
    target: { value: "Private control explanation" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Refresh the changed submission.",
  );
  expect(
    screen.getByLabelText("Ownership and control information"),
  ).toHaveValue("Private control explanation");
  expect(reload).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledOnce();
});
