import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { emptyConfiguration, emptyField } from "../catalog/model";
import { submissionSchema } from "../submissions/model";
import { productSchema } from "./model";
import SummaryFields, { sellerSummary } from "./summary-fields";
import { productIssues } from "./validation";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";

const config = emptyConfiguration("Test game");
config.intake = {
  name: "Intake",
  description: "",
  rules: [],
  fields: [
    {
      ...emptyField("skin_data"),
      type: "cosmetics",
      stage: "order",
      options: [{ key: "collector", label: "Collector", units: 0 }],
    },
  ],
  summary: {
    hero_count: "roster",
    skin_collection: "skin_data",
    selling_point: "reason",
    has_skins: "skins_present",
  },
};
const submission = submissionSchema.parse({
  submission: {
    id: "submission",
    version: 1,
    title: "Account",
    game: "Test",
    state: "accepted",
    created_at: "",
    updated_at: "",
  },
  offer: {
    id: "release",
    game_id: "game",
    slug: "test",
    version: 1,
    paused: false,
    created_at: "",
    configuration: config,
  },
  answers: {
    roster: "125",
    reason: "Rare skins for EXP mains",
    skin_data: {
      groups: [
        { category: "collector", count: "2", names: ["Aldous", "Yu Zhong"] },
      ],
    },
    private_note: "Do not publish this",
  },
  ownership_notes: "Private ownership notes",
  ownership_declared: true,
  note: "",
  conversation_id: "chat",
});
const product = productSchema.parse({
  title: "Test",
  description: "A reviewed public account description",
  region: "Europe",
  rank: "Mythic",
  attributes: [],
  media_ids: [],
  currency: "USD",
  amount_minor: "10500",
  commission: {
    version: "account_commission_v1",
    base_minor: "10000",
    fee_minor: "500",
    total_minor: "10500",
  },
  sale_terms: "Complete buyer sale terms",
  transfer_requirements: "Complete buyer transfer terms",
  dispute_terms: "Complete buyer dispute terms",
  acknowledgement_terms: "Complete acknowledgement terms",
  dispute_hours: 168,
  delivery_min_hours: 1,
  delivery_max_hours: 24,
});
it("copies only mapped seller claims after an explicit staff action", () => {
  const change = vi.fn();
  render(
    <SummaryFields product={product} submission={submission} change={change} />,
  );
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Use seller’s summary for review" }),
  );
  expect(change).toHaveBeenCalledWith({
    ...product,
    hero_count: 125,
    selling_point: "Rare skins for EXP mains",
    skin_collection: {
      groups: [
        { category: "Collector", count: "2", names: ["Aldous", "Yu Zhong"] },
      ],
    },
  });
  expect(JSON.stringify(change.mock.calls)).not.toContain("Private ownership");
  expect(JSON.stringify(change.mock.calls)).not.toContain("Do not publish");
});
it("preserves unknown old submissions and supports explicitly declared zero skins", () => {
  const old = structuredClone(submission);
  if (!old.offer.configuration.intake) throw new Error("Missing test intake");
  delete old.offer.configuration.intake.summary;
  expect(sellerSummary(old)).toEqual({});
  const zero = structuredClone(submission);
  delete zero.answers.skin_data;
  zero.answers.skins_present = false;
  expect(sellerSummary(zero).skin_collection).toEqual({ groups: [] });
  expect(
    productIssues({
      ...product,
      hero_count: 0,
      skin_collection: { groups: [] },
    }),
  ).toEqual([]);
});
it("returns precise repair paths for public collection count and names errors", () => {
  const invalid = {
    ...product,
    hero_count: -1,
    selling_point: "x".repeat(181),
    skin_collection: {
      groups: [
        { category: "Collector", count: "3", names: ["Aldous", "Aldous"] },
      ],
    },
  };
  expect(productIssues(invalid).map((i) => i.path)).toEqual(
    expect.arrayContaining([
      "product.hero_count",
      "product.selling_point",
      "product.skin_collection.groups.0.count",
      "product.skin_collection.groups.0.names",
    ]),
  );
});

it("keeps invalid hero input editable until repaired", () => {
  function Editor() {
    const [value, setValue] = useState(product);
    return (
      <SummaryFields product={value} submission={undefined} change={setValue} />
    );
  }
  render(<Editor />);
  const input = screen.getByLabelText("Hero count");
  fireEvent.change(input, { target: { value: "12.5" } });
  expect(input).toHaveValue("12.5");
  expect(input).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(input, { target: { value: "125" } });
  expect(input).toHaveValue("125");
  expect(input).not.toHaveAttribute("aria-invalid");
  fireEvent.change(input, { target: { value: "" } });
  expect(input).toHaveValue("");
});

it("focuses and describes collection-wide errors before the skin groups", async () => {
  function Editor() {
    const [issues, setIssues] = useState<FieldIssue[]>([]);
    const validation = useFormValidation(issues, () => {
      setIssues([]);
    });
    return (
      <FieldValidation.Provider value={validation}>
        <SummaryFields
          product={{
            ...product,
            skin_collection: {
              groups: [
                {
                  category: "Collector",
                  count: "2",
                  names: ["Aldous", "Yu Zhong"],
                },
              ],
            },
          }}
          submission={undefined}
          change={() => {}}
        />
        <button
          onClick={() => {
            setIssues([
              {
                path: "product.skin_collection",
                message: "Use no more than 1,000 skins in total.",
              },
            ]);
          }}
        >
          Validate collection
        </button>
      </FieldValidation.Provider>
    );
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Validate collection" }));
  const target = screen.getByRole("group", {
    name: "Skin collection feedback",
  });
  await waitFor(() => {
    expect(target).toHaveFocus();
  });
  expect(target).toHaveAccessibleDescription(
    "Use no more than 1,000 skins in total.",
  );
  expect(
    target.compareDocumentPosition(screen.getByLabelText("Skin category 1")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
