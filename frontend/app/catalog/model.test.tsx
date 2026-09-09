import { describe, expect, it } from "vitest";
import {
  emptyConfiguration,
  emptyField,
  emptyVariant,
  matches,
  price,
  visibleAnswers,
  type Condition,
  type Service,
} from "./model";
import { move } from "./controls";
const leaf = (field: string, op: string, ...values: string[]): Condition => ({
  field,
  op,
  values,
  children: [],
});
const service: Service = {
  key: "boost",
  name: "Test boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    { ...emptyField("mode"), type: "boolean" },
    {
      ...emptyField("hero"),
      visible_when: leaf("mode", "eq", "true"),
      required_when: leaf("mode", "eq", "true"),
    },
    { ...emptyField("number"), type: "decimal" },
    { ...emptyField("private"), stage: "fulfillment" },
  ],
};
describe("declarative catalog evaluation", () => {
  it("uses exact bounded decimals and typed conditions", () => {
    expect(
      matches(
        leaf("number", "eq", "75.1"),
        { number: "75.10" },
        service.fields,
      ),
    ).toBe(true);
    expect(
      matches(
        leaf("number", "gt", "999999999999.999998"),
        { number: "999999999999.999999" },
        service.fields,
      ),
    ).toBe(true);
    for (const value of ["1e2", "NaN", "01", "1.", "-", "1".repeat(100000)])
      expect(
        matches(leaf("number", "gte", "0"), { number: value }, service.fields),
      ).toBe(false);
    expect(
      matches(
        {
          field: "",
          op: "all",
          values: [],
          children: [
            leaf("mode", "eq", "true"),
            leaf("number", "in", "50", "75.1"),
          ],
        },
        { mode: true, number: "75.100" },
        service.fields,
      ),
    ).toBe(true);
    expect(
      matches(
        leaf("hero", "in", "alpha"),
        { hero: ["alpha", "beta"] },
        service.fields,
      ),
    ).toBe(true);
  });
  it("discards hidden, unknown and future fields without reviving old selections", () => {
    const hidden = visibleAnswers(
      service,
      { mode: false, hero: "stale", private: "secret", unknown: "value" },
      "estimate",
    );
    expect({ ...hidden }).toEqual({ mode: false });
    expect({
      ...visibleAnswers(service, { ...hidden, mode: true }, "estimate"),
    }).toEqual({ mode: true });
    expect({
      ...visibleAnswers(service, { mode: true, hero: "alpha" }, "estimate"),
    }).toEqual({ mode: true, hero: "alpha" });
  });
  it("terminates draft cycles and applies only visible defaults", () => {
    const draft = structuredClone(service);
    draft.fields[0] = {
      ...emptyField("mode"),
      type: "boolean",
      visible_when: leaf("hero", "eq", "alpha"),
    };
    draft.fields[1] = {
      ...emptyField("hero"),
      default: "alpha",
      visible_when: leaf("mode", "eq", "true"),
    };
    expect({ ...visibleAnswers(draft, { mode: true }, "estimate") }).toEqual(
      {},
    );
  });
  it("keeps minor-unit money exact and never invents a draft price", () => {
    expect(price(emptyVariant("x"))).toBe("Price pending review");
    expect(
      price({
        ...emptyVariant("x"),
        currency: "USD",
        amount_minor: "999999999999",
      }),
    ).toBe("USD 9999999999.99");
    expect(emptyConfiguration("Draft").reviewed).toBe(false);
    expect(move(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(move(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});

it("does not inherit object prototype values as form answers", () => {
  const definition = {
    ...service,
    fields: [{ ...emptyField("constructor"), type: "short_text" as const }],
  };
  expect({ ...visibleAnswers(definition, {}, "estimate") }).toEqual({});
  expect(
    matches(
      { field: "constructor", op: "eq", values: ["anything"], children: [] },
      {},
      definition.fields,
    ),
  ).toBe(false);
});
