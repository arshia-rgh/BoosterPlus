import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PolicyText from "./policy-text";
import PolicyDocument from "./policy-document";
import { readablePolicyText } from "./policy-layout.server";
import { loadTerms } from "./loaders.server";

afterEach(() => vi.unstubAllEnvs());

const published = readFileSync(
  "tests/fixtures/published-policy-v1.txt",
  "utf8",
);
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
it("formats the historical bootstrap display without changing its configured agreement", async () => {
  vi.stubEnv("ACCOUNT_TERMS_TEXT", published);
  vi.stubEnv("TERMS_VERSION", "playora-2026-10-05-v1");
  vi.stubEnv("APP_ENV", "production");
  const data = await loadTerms("playora-2026-10-05-v1");
  expect(normalize(data.text)).toBe(published);
  expect(data.text).toContain("\n\n1. PLAYORA");
  expect(data.version).toBe("playora-2026-10-05-v1");
  expect(process.env.ACCOUNT_TERMS_TEXT).toBe(published);
});
it("restores only whitespace for the exact published agreement and leaves any other version alone", () => {
  const formatted = readablePolicyText(published);
  expect(formatted).toContain("\n\n1. PLAYORA");
  expect(normalize(formatted)).toBe(published);
  expect(formatted).toContain("\n\n11. Complaints and changes\n\n");
  expect(formatted).toContain("\n\n10. Changes\n\n");
  const revised = published.replace("24/7", "scheduled");
  expect(readablePolicyText(revised)).toBe(revised);
  expect(readablePolicyText("An earlier agreement.\nKeep its wording.")).toBe(
    "An earlier agreement.\nKeep its wording.",
  );
});
it("makes every published clause reachable and renders tables and bullets without hiding the body", () => {
  const { container } = render(
    <PolicyText text={readablePolicyText(published)} prefix="terms" />,
  );
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(21);
  expect(
    screen.getByRole("heading", {
      name: "Account damage caused by our service",
    }),
  ).toBeVisible();
  const contents = screen.getByRole("navigation", {
    name: "Jump to a policy section",
  });
  for (const link of within(contents).getAllByRole("link")) {
    const href = link.getAttribute("href");
    expect(href).toBeTruthy();
    expect(container.querySelector(href ?? "")).toHaveTextContent(
      link.textContent,
    );
  }
  expect(container.querySelectorAll(".policy-facts")).toHaveLength(3);
  expect(screen.getByText("Private game access")).toBeVisible();
  expect(
    screen.getByText(
      "A seller or previous owner recovers the account or its required recovery access.",
    ),
  ).toBeVisible();
});
it("escapes markup, retains malformed table text and keeps historical policy navigation", () => {
  const unsafe = "<script>alert(1)</script>\n\n| incomplete |\n| table |";
  const { container } = render(
    <PolicyDocument
      requestedVersion="old-v1"
      kind="refunds"
      data={{
        text: "Original account terms.",
        preview: false,
        version: "old-v1",
        sections: [{ kind: "refunds", title: "Refund policy", text: unsafe }],
      }}
    />,
  );
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText("<script>alert(1)</script>")).toBeVisible();
  expect(screen.getByText(/incomplete/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Account terms" })).toHaveAttribute(
    "href",
    "/terms?version=old-v1",
  );
  expect(
    screen.getByRole("link", { name: "Read the current published version" }),
  ).toHaveAttribute("href", "/policies/refunds");
  expect(
    screen.getByRole("button", { name: "Print this policy" }),
  ).toBeVisible();
});
