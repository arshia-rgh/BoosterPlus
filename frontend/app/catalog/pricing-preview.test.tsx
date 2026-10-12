import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { post, APIError } from "../identity/api";
import PricingPreview from "./pricing-preview";
import {
  emptyConfiguration,
  type Estimate,
  type PriceCase,
  type Service,
} from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const config = emptyConfiguration("Synthetic");
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "pricing-v1",
  fields: [],
  rules: [],
};
const example: PriceCase = {
  key: "basic",
  answers: {},
  outcome: "estimated",
  amount_minor: "1200",
};
const result: Estimate = {
  release_id: "2",
  version: 2,
  evaluator: "pricing-v1",
  expires_at: "2026-10-12T00:00:00Z",
  outcome: "estimated",
  currency: "USD",
  amount_minor: "1200",
  answers: {},
  lines: [{ key: "base", label: "Base price", amount_minor: "1200" }],
  issues: [],
};
const props = {
  context: { gameID: "synthetic", revision: 2 },
  config,
  service,
  example,
};
it("checks unsaved rules and compares an independently specified total", async () => {
  vi.mocked(post).mockResolvedValueOnce(result);
  render(<PricingPreview {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Check this price example" }),
  );
  expect(await screen.findByText("Actual result: USD 12.00")).toBeVisible();
  expect(screen.getByText("Matches your expected result.")).toBeVisible();
  expect(post).toHaveBeenCalledWith(
    expect.stringContaining("estimate-preview"),
    expect.objectContaining({ configuration: config, release_id: "2" }),
    expect.anything(),
  );
  expect(example.amount_minor).toBe("1200");
});
it("does not present an in-flight result as current after editing the rules", async () => {
  const onIssues = vi.fn();
  let resolve!: (value: Estimate) => void;
  vi.mocked(post).mockImplementationOnce(
    () =>
      new Promise<Estimate>((done) => {
        resolve = done;
      }),
  );
  const view = render(<PricingPreview {...props} onIssues={onIssues} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Check this price example" }),
  );
  view.rerender(
    <PricingPreview
      {...props}
      onIssues={onIssues}
      config={{ ...config, name: "Changed" }}
    />,
  );
  resolve(result);
  expect(await screen.findByText(/form or pricing changed/)).toBeVisible();
  expect(screen.queryByText(/Actual result/)).not.toBeInTheDocument();
  expect(onIssues).toHaveBeenCalledExactlyOnceWith([]);
});

it("routes invalid example choices to the correct inline field path", async () => {
  const onIssues = vi.fn();
  vi.mocked(post).mockResolvedValueOnce({
    ...result,
    outcome: "invalid",
    issues: [{ path: "region", message: "Choose a region." }],
  });
  render(
    <PricingPreview
      {...props}
      path="services.0.pricing.cases.1"
      onIssues={onIssues}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Check this price example" }),
  );
  await waitFor(() => {
    expect(onIssues).toHaveBeenLastCalledWith([
      {
        path: "services.0.pricing.cases.1.answers.region",
        message: "Choose a region.",
      },
    ]);
  });
});
it("reports a mismatch, configuration failure and retry without changing the expectation", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(new APIError("Review the pricing fields."))
    .mockResolvedValueOnce({ ...result, amount_minor: "1300" });
  render(<PricingPreview {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Check this price example" }),
  );
  expect(await screen.findByText("Review the pricing fields.")).toBeVisible();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Check this price example" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Check this price example" }),
  );
  expect(await screen.findByText(/Does not match/)).toBeVisible();
  expect(example.amount_minor).toBe("1200");
});
