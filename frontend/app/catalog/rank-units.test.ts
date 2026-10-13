import { expect, it } from "vitest";
import { emptyConfiguration, emptyField, type Service } from "./model";
import { rankUnitsField, rankUnitsError } from "./rank-units";
const field = {
  ...emptyField("stars"),
  type: "integer" as const,
  help: "Use the game's total.",
};
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  fields: [{ ...emptyField("rank"), type: "rank", reference: "ranks" }, field],
  rules: [
    {
      key: "progress",
      kind: "progression",
      message: "",
      from: "rank",
      to: "target",
      from_units: "stars",
      to_units: "target_stars",
    },
  ],
};
const config = {
  ...emptyConfiguration("Game"),
  references: [
    {
      key: "ranks",
      label: "Ranks",
      kind: "rank",
      options: [
        { key: "glory", label: "Mythical Glory", units: 50, unit_start: 50 },
        { key: "old", label: "Historical", units: 50 },
      ],
    },
  ],
};
it("presents actual rank stars and retains invalid input for correction", () => {
  const answers = { rank: "glory", stars: "62" };
  expect(rankUnitsField(service, config, field, answers)).toMatchObject({
    min: "50",
    max: "99",
  });
  expect(rankUnitsError(service, config, field, answers)).toBeUndefined();
  expect(
    rankUnitsError(service, config, field, { rank: "glory", stars: "100" }),
  ).toContain("50–99");
  expect(
    rankUnitsError(service, config, field, { rank: "glory", stars: "12" }),
  ).toContain("Enter 50–99 stars");
  expect(answers.stars).toBe("62");
});
it("preserves inclusive legacy boundaries and leaves unknown rank fields alone", () => {
  expect(rankUnitsField(service, config, field, { rank: "old" })).toMatchObject(
    { min: "0", max: "50" },
  );
  expect(
    rankUnitsError(service, config, field, { rank: "old", stars: "50" }),
  ).toBeUndefined();
  expect(rankUnitsField(service, config, field, {})).toBe(field);
  expect(
    rankUnitsError(service, config, field, { rank: "glory", stars: "" }),
  ).toBeUndefined();
});
