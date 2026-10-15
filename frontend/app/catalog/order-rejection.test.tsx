import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import DynamicForm from "./dynamic-form";
import { emptyConfiguration, emptyField, type Service } from "./model";
import { APIError, get, post } from "../identity/api";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    {
      ...emptyField("goal"),
      type: "short_text",
      label: "Goal",
      stage: "estimate",
      required: true,
    },
    {
      ...emptyField("region"),
      type: "short_text",
      label: "Region",
      stage: "order",
      required: true,
    },
  ],
};
const config = { ...emptyConfiguration("Game"), services: [service] };
function Journey() {
  const [stage, setStage] = useState<"estimate" | "order">("order");
  return (
    <>
      <span data-testid="stage">{stage}</span>
      <DynamicForm
        config={config}
        service={service}
        slug="game"
        releaseID="release"
        stage={stage}
        initialAnswers={{ goal: "Legend", region: "Europe" }}
        journey={{
          edit: () => {
            setStage("estimate");
          },
          review: () => {
            setStage("order");
          },
          invalidate: () => {},
        }}
      />
    </>
  );
}
it.each(["goal", "region"])(
  "retains and focuses rejected %s across its real journey transition",
  async (path) => {
    vi.mocked(get).mockResolvedValue({
      portal: "customer",
      csrf_token: "x".repeat(48),
      user: {
        portal: "customer",
        id: "buyer",
        email: "buyer@example.test",
        display_name: "Buyer",
        role: "customer",
        staff_alias: "",
        suspended: false,
        mfa_enabled: false,
        notify_updates: true,
      },
      google_enabled: false,
      google_linked: false,
      mfa_required: false,
      capabilities: ["account"],
      terms_version: "v1",
      terms_url: "/terms",
    });
    vi.mocked(post).mockImplementation((endpoint) => {
      if (endpoint === "/orders")
        return Promise.reject(
          Object.assign(new APIError("Check the highlighted field."), {
            status: 422,
            issues: [{ path, message: "Use a supported value." }],
          }),
        );
      if (endpoint.endsWith("/estimate"))
        return Promise.resolve({
          release_id: "release",
          evaluator: "manual-review-v1",
          expires_at: "2099-01-01T00:00:00Z",
          outcome: "manual_review",
          currency: "",
          amount_minor: "",
          answers: { goal: "Legend" },
          issues: [],
          lines: [],
        });
      return Promise.resolve({
        answers: { goal: "Legend", region: "Europe" },
        issues: [],
      });
    });
    render(
      <MemoryRouter>
        <Journey />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
    const submit = await screen.findByRole("button", {
      name: "Submit quote request",
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submit);
    const target = await screen.findByLabelText(
      path === "goal" ? "Goal (required)" : "Region (required)",
    );
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveAccessibleDescription("Use a supported value.");
    expect(target).toHaveValue(path === "goal" ? "Legend" : "Europe");
    expect(screen.getByTestId("stage")).toHaveTextContent(
      path === "goal" ? "estimate" : "order",
    );
    expect(post).toHaveBeenCalledWith(
      "/orders",
      expect.anything(),
      expect.anything(),
    );
  },
);
