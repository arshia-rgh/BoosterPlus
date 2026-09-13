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
