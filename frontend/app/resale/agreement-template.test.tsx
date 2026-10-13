import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import ReviewPolicyEditor from "../catalog/review-policy-editor";
import { emptyConfiguration } from "../catalog/model";
import { ProductFields } from "../shop/fields";
import { emptyDefinition } from "../shop/model";
import { AgreementTemplate } from "./agreement-template";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

function ReviewEditor() {
  const [config, setConfig] = useState({
    ...emptyConfiguration("Game"),
    review_policy: { content: "Original wording", fields: [], rules: [] },
  } as ReturnType<typeof emptyConfiguration>);
  return (
    <ReviewPolicyEditor
      config={config}
      change={(review_policy) => {
        setConfig({ ...config, review_policy });
      }}
    />
  );
}
function ShopEditor() {
  const [value, setValue] = useState(emptyDefinition());
  return <ProductFields section="terms" value={value} change={setValue} />;
}

it("preserves feedback fields added while approved wording loads", async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(get).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<ReviewEditor />);
  const button = screen.getByRole("button", {
    name: "Replace with approved review rules",
  });
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(
    screen.getByRole("button", { name: "Add feedback attribute" }),
  );
  await act(async () => {
    finish({ review_policy: "Approved review wording" });
    await Promise.resolve();
  });
  expect(screen.getByText("Feedback attribute: New field")).toBeVisible();
  expect(screen.getByLabelText("Review publication policy")).toHaveValue(
    "Approved review wording",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Approved wording applied",
  );
});

it("preserves delivery capacity edited during shop template loading", async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(get).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<ShopEditor />);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Replace policy text with approved shop terms",
    }),
  );
  fireEvent.change(screen.getByLabelText("Maximum delivery hours"), {
    target: { value: "48" },
  });
  await act(async () => {
    finish({ shop: { delivery_terms: "Approved delivery wording" } });
    await Promise.resolve();
  });
  expect(screen.getByLabelText("Maximum delivery hours")).toHaveValue("48");
  expect(screen.getByLabelText("Delivery terms")).toHaveValue(
    "Approved delivery wording",
  );
});

it("ignores duplicate clicks and results after leaving the editor", async () => {
  let finish!: (value: unknown) => void;
  const apply = vi.fn();
  vi.mocked(get).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(
    <AgreementTemplate label="Apply wording" apply={apply} />,
  );
  const button = screen.getByRole("button");
  fireEvent.click(button);
  fireEvent.click(button);
  expect(get).toHaveBeenCalledOnce();
  view.unmount();
  await act(async () => {
    finish({ review_policy: "Unused wording" });
    await Promise.resolve();
  });
  expect(apply).not.toHaveBeenCalled();
});
