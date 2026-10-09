import { afterEach, expect, it, vi } from "vitest";
import {
  clearConfigurationDraft,
  draftSnapshot,
  restoreConfiguration,
  safeConfiguration,
  saveConfigurationDraft,
} from "./configuration-draft";
import { emptyConfiguration, emptyField, type Service } from "./model";
const service: Service = {
  key: "rank",
  name: "Rank",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    {
      ...emptyField("current"),
      type: "rank",
      options: [{ key: "a", label: "Rank A", units: 1 }],
    },
    {
      ...emptyField("hero"),
      type: "multiselect",
      options: [{ key: "h", label: "Hero H", units: 1 }],
    },
    { ...emptyField("one"), type: "boolean" },
    { ...emptyField("games"), type: "integer" },
    { ...emptyField("message"), type: "long_text" },
    { ...emptyField("player"), type: "integer", stage: "order" },
    { ...emptyField("secret"), type: "short_text", stage: "fulfillment" },
  ],
};
const config = { ...emptyConfiguration("Example"), services: [service] };
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it("persists only bounded non-sensitive declared estimate choices and drops hidden/private inputs", () => {
  const answers = {
    current: "a",
    hero: ["h"],
    one: true,
    games: "12",
    message: "private",
    player: "5678",
    secret: "never-save",
    unknown: "no",
  };
  expect(safeConfiguration(service, config, answers)).toEqual({
    current: "a",
    hero: ["h"],
    one: true,
    games: "12",
  });
  saveConfigurationDraft("v1", service, config, "", "", answers);
  const raw = draftSnapshot();
  expect(raw).not.toMatch(/private|5678|never-save|unknown/);
  expect(restoreConfiguration(raw, "v1", service, config, "", "")).toEqual({
    current: "a",
    hero: ["h"],
    one: true,
    games: "12",
  });
  expect(restoreConfiguration(raw, "v2", service, config, "", "")).toBeNull();
  expect(
    restoreConfiguration(raw, "v1", service, config, "other", ""),
  ).toBeNull();
  clearConfigurationDraft();
  expect(draftSnapshot()).toBeNull();
});
it("rejects tampered, expired and oversized data and does not restore validation or consent", () => {
  expect(
    safeConfiguration(service, config, {
      current: "injected",
      hero: ["not-published"],
      games: "<script>",
    }),
  ).toEqual({});
  expect(
    restoreConfiguration("invalid", "v1", service, config, "", ""),
  ).toBeNull();
  expect(
    restoreConfiguration("x".repeat(21000), "v1", service, config, "", ""),
  ).toBeNull();
  saveConfigurationDraft("v1", service, config, "", "", { one: false });
  const raw = draftSnapshot();
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 16 * 60_000);
  expect(restoreConfiguration(raw, "v1", service, config, "", "")).toBeNull();
});
it("storage failure never prevents configuring or signing in", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => {
    saveConfigurationDraft("v1", service, config, "", "", {});
  }).not.toThrow();
});

it.each(["win_rate", "decimal"] as const)(
  "preserves only supported win-rate choices for %s fields across sign-in",
  (type) => {
    const field = {
      ...emptyField("requested_win_rate"),
      type,
      unit: "%",
      min: "0",
      max: "100",
    };
    const request = { ...service, fields: [...service.fields, field] };
    const definition = { ...config, services: [request] };
    for (const selection of [
      "any",
      "range:80:90",
      "below:80",
      "above:70.5",
      "exact:100",
    ]) {
      const answers = {
        current: "a",
        requested_win_rate: selection,
        message: "private",
      };
      saveConfigurationDraft("v1", request, definition, "", "", answers);
      expect(
        restoreConfiguration(
          draftSnapshot(),
          "v1",
          request,
          definition,
          "",
          "",
        ),
      ).toEqual({ current: "a", requested_win_rate: selection });
      expect(draftSnapshot()).not.toContain("private");
    }
    for (const selection of [
      "85",
      "100",
      "exact:85",
      "range:90:80",
      "range:80:101",
      "above:100",
      "free text",
      "range:80:90:extra",
    ]) {
      expect(
        safeConfiguration(request, definition, {
          requested_win_rate: selection,
        }),
      ).toEqual({});
    }
    const afterOrder = {
      ...request,
      fields: [{ ...field, stage: "order" as const }],
    };
    expect(
      safeConfiguration(afterOrder, definition, {
        requested_win_rate: "range:80:90",
      }),
    ).toEqual({});
  },
);
