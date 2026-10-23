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

it("applies configured server/region relationships to seller drafts before saving", async () => {
  const value = fixture();
  value.offer.configuration.intake = {
    name: "Account region",
    description: "",
    fields: [
      {
        ...emptyField("region"),
        label: "Region",
        stage: "order",
        options: [
          { key: "Europe", label: "Europe", units: 0 },
          { key: "Asia", label: "Asia", units: 0 },
        ],
      },
      {
        ...emptyField("server"),
        label: "Server",
        stage: "order",
        options: [
          { key: "EU 1", label: "EU 1", units: 0 },
          { key: "Asia 1", label: "Asia 1", units: 0 },
        ],
      },
    ],
    rules: [
      {
        key: "regions",
        kind: "linked_choices",
        from: "region",
        to: "server",
        from_units: "",
        to_units: "",
        link_mode: "single_parent",
        message: "Choose the correct region",
        links: [
          { parent: "Europe", children: ["EU 1"] },
          { parent: "Asia", children: ["Asia 1"] },
        ],
      },
    ],
  };
  vi.mocked(post).mockResolvedValue({
    ...value,
    answers: { region: "Europe", server: "EU 1" },
  });
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Server"), {
    target: { value: "EU 1" },
  });
  expect(screen.getByLabelText("Region")).toHaveValue("Europe");
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/submissions/submission/edit",
      expect.objectContaining({
        answers: { region: "Europe", server: "EU 1" },
      }),
      expect.anything(),
    );
  });
  await waitFor(() => expect(screen.getByLabelText("Region")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Region"), {
    target: { value: "Asia" },
  });
  expect(screen.getByLabelText("Server")).toHaveValue("");
  expect(
    screen.queryByRole("option", { name: "EU 1" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Incompatible selections were removed/),
  ).toHaveAttribute("role", "status");
});
it("keeps edits private until an explicit save or submit action", async () => {
  const value = fixture(),
    reload = vi.fn();
  vi.mocked(post).mockResolvedValue(value);
  render(<SubmissionEditor value={value} reload={reload} />);
  const submit = screen.getByRole("button", {
    name: "Save and submit for review",
  });
  fireEvent.change(screen.getByLabelText("Account title (required)"), {
    target: { value: "Edited private title" },
  });
  expect(submit).toBeEnabled();
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
  fireEvent.change(screen.getByLabelText("Account notes (optional)"), {
    target: { value: "Private control explanation" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Refresh the changed submission.",
  );
  expect(screen.getByLabelText("Account notes (optional)")).toHaveValue(
    "Private control explanation",
  );
  expect(reload).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledOnce();
});

it("preserves a dirty draft across a newer server revision until explicitly discarded", () => {
  const value = fixture();
  const reload = vi.fn();
  const { rerender } = render(
    <SubmissionEditor value={value} reload={reload} />,
  );
  fireEvent.change(screen.getByLabelText("Account title (required)"), {
    target: { value: "Unsaved ordinary draft" },
  });
  const current = {
    ...value,
    submission: {
      ...value.submission,
      version: 5,
      title: "Changed by another tab",
    },
  };
  rerender(<SubmissionEditor value={current} reload={reload} />);
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "Unsaved ordinary draft",
  );
  expect(
    screen.getByRole("button", { name: "Save account draft" }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "This submission changed",
  );
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Discard this draft and load current details",
    }),
  );
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "Changed by another tab",
  );
  expect(
    screen.getByRole("button", { name: "Save account draft" }),
  ).toBeEnabled();
});
it("submits only the acknowledged saved revision without waiting for a parent refresh", async () => {
  const value = fixture(),
    saved = {
      ...value,
      ownership_notes: "I own and control this account.",
      ownership_declared: true,
      submission: { ...value.submission, version: 5, title: "Saved title" },
    };
  vi.mocked(post).mockResolvedValue(saved);
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Account title (required)"), {
    target: { value: "Saved title" },
  });
  fireEvent.change(screen.getByLabelText("Account notes (optional)"), {
    target: { value: saved.ownership_notes },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Save and submit for review" }),
    ).toBeEnabled();
  });
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "Saved title",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save and submit for review" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenLastCalledWith(
      "/submissions/submission/submit",
      { version: 5, note: "" },
      expect.anything(),
    );
  });
});
it("updates an untouched form when current details change", () => {
  const value = fixture();
  const { rerender } = render(
    <SubmissionEditor value={value} reload={vi.fn()} />,
  );
  rerender(
    <SubmissionEditor
      value={{
        ...value,
        submission: { ...value.submission, version: 5, title: "Fresh record" },
      }}
      reload={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "Fresh record",
  );
});

it("saves and submits in one action using the returned revision, with optional notes", async () => {
  const value = fixture(),
    saved = {
      ...value,
      ownership_declared: true,
      submission: { ...value.submission, version: 5, title: "New title" },
    };
  vi.mocked(post)
    .mockResolvedValueOnce(saved)
    .mockResolvedValueOnce({
      ...saved,
      submission: { ...saved.submission, version: 6, state: "submitted" },
    });
  const reload = vi.fn();
  render(<SubmissionEditor value={value} reload={reload} />);
  fireEvent.change(screen.getByLabelText("Account title (required)"), {
    target: { value: "New title" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Save and submit for review" }),
  );
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenNthCalledWith(
    1,
    "/submissions/submission/edit",
    expect.objectContaining({
      version: 4,
      title: "New title",
      ownership_notes: "",
      ownership_declared: true,
    }),
    expect.anything(),
  );
  expect(post).toHaveBeenNthCalledWith(
    2,
    "/submissions/submission/submit",
    { version: 5, note: "" },
    expect.anything(),
  );
});
it("retains saved input and its actual revision when submission validation fails", async () => {
  const value = fixture(),
    saved = {
      ...value,
      ownership_declared: true,
      submission: { ...value.submission, version: 5, title: "New title" },
    };
  vi.mocked(post)
    .mockResolvedValueOnce(saved)
    .mockRejectedValueOnce(new APIError("Complete required game details."));
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Account title (required)"), {
    target: { value: "New title" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Save and submit for review" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Complete required game details.",
  );
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "New title",
  );
  vi.mocked(post).mockResolvedValue(saved);
  fireEvent.click(
    screen.getByRole("button", { name: "Save and submit for review" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(3);
  });
  expect(post).toHaveBeenLastCalledWith(
    "/submissions/submission/submit",
    { version: 5, note: "" },
    expect.anything(),
  );
});

it("shows API field errors under seller answers and focuses the first editable field", async () => {
  const value = fixture();
  value.ownership_declared = true;
  const error = new APIError("Complete the highlighted account details.");
  error.status = 422;
  error.issues = [{ path: "region", message: "Select the account region." }];
  vi.mocked(post).mockRejectedValueOnce(error);
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Save and submit for review" }),
  );
  const region = screen.getByLabelText("Region (required)");
  await waitFor(() => expect(region).toHaveFocus());
  expect(region).toHaveAttribute("aria-invalid", "true");
  expect(region).toHaveAccessibleDescription("Select the account region.");
  expect(screen.getByLabelText("Account title (required)")).toHaveValue(
    "Private account",
  );
});

function optionalSkinsFixture(): Submission {
  const value = fixture();
  value.offer.configuration.intake = {
    name: "Account details",
    description: "",
    rules: [],
    fields: [
      {
        ...emptyField("skins"),
        key: "skins",
        label: "Skin collection (optional)",
        type: "cosmetics",
        stage: "order",
        required: false,
        options: [{ key: "Collector", label: "Collector", units: 0 }],
      },
    ],
  };
  return value;
}
it("offers skin groups directly and preserves an omitted optional collection", async () => {
  const value = optionalSkinsFixture();
  vi.mocked(post).mockResolvedValue(value);
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  expect(
    screen.queryByText(/Does this account have skins/),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add skin group" })).toBeEnabled();
  expect(screen.queryByLabelText("Skin category 1")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/submissions/submission/edit",
      expect.objectContaining({ answers: {} }),
      expect.anything(),
    );
  });
});
it("edits saved skin groups directly and can remove the final optional group", async () => {
  const value = optionalSkinsFixture();
  value.answers = {
    skins: {
      groups: [
        { category: "Collector", count: "2", names: ["Aldous", "Yu Zhong"] },
      ],
    },
  };
  vi.mocked(post).mockResolvedValue({
    ...value,
    answers: { skins: { groups: [] } },
  });
  render(<SubmissionEditor value={value} reload={vi.fn()} />);
  expect(screen.getByLabelText("Quantity in group 1")).toHaveValue("2");
  expect(screen.getByLabelText("Skin or hero names in group 1")).toHaveValue(
    "Aldous\nYu Zhong",
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove skin group 1" }));
  expect(screen.queryByLabelText("Skin category 1")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save account draft" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/submissions/submission/edit",
      expect.objectContaining({ answers: { skins: { groups: [] } } }),
      expect.anything(),
    );
  });
});
