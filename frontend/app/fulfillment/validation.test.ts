import { expect, it } from "vitest";
import {
  localTimeIssues,
  windowIssues,
  noteIssues,
  validZone,
} from "./validation";
it("identifies partial and impossible dates without interpreting another zone in browser local time", () => {
  expect(
    localTimeIssues(
      { local: "2026-02-31T10:00", zone: "UTC", occurrence: "" },
      "start",
      true,
    ).map((issue) => issue.path),
  ).toContain("start.date");
  expect(
    localTimeIssues(
      { local: "2026-10-08T", zone: "UTC", occurrence: "" },
      "start",
      true,
    ).map((issue) => issue.path),
  ).toContain("start.time");
  expect(
    windowIssues(
      { local: "2026-10-08T10:00", zone: "UTC", occurrence: "" },
      { local: "2026-10-08T10:05", zone: "UTC", occurrence: "" },
    ),
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "end.local" })]),
  );
  expect(
    windowIssues(
      { local: "2026-10-25T01:45", zone: "Europe/London", occurrence: "first" },
      {
        local: "2026-10-25T01:30",
        zone: "Europe/London",
        occurrence: "second",
      },
    ),
  ).toEqual([]);
  expect(validZone("Europe/London")).toBe(true);
  expect(validZone("invalid-zone")).toBe(false);
  expect(noteIssues(" ")).toHaveLength(1);
  expect(noteIssues("🎮".repeat(2000))).toEqual([]);
});
