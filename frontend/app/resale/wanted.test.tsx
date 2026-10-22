import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useRef } from "react";
import { get } from "../identity/api";
import {
  useWantedAccounts,
  WantedAccounts,
  WantedTeaser,
  type WantedPublic,
} from "./wanted";
import { wantedIssues } from "./wanted-admin";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function Harness() {
  const items = useWantedAccounts("mobile-legends");
  const section = useRef<HTMLElement>(null);
  return (
    <MemoryRouter>
      <p>{items.length > 0 && <WantedTeaser section={section} />}</p>
      <WantedAccounts slug="mobile-legends" items={items} section={section} />
    </MemoryRouter>
  );
}
const items: WantedPublic["items"] = [
  {
    id: "00000000-0000-4000-8000-000000004801",
    title: "<b>Mythical Glory</b> account",
    description:
      "Europe.\n<script>alert(1)</script> **bold** https://example.test",
  },
];

it("renders staff text literally with one sell action", async () => {
  vi.mocked(get).mockResolvedValue({ items });
  const { container } = render(<Harness />);
  const section = await screen.findByRole("region", {
    name: "Wanted accounts",
  });
  expect(get).toHaveBeenCalledWith(
    "/games/mobile-legends/wanted-accounts",
    expect.anything(),
    "customer",
  );
  expect(
    screen.getByRole("heading", {
      level: 4,
      name: "<b>Mythical Glory</b> account",
    }),
  ).toBeVisible();
  expect(container.querySelector("b, script")).toBeNull();
  expect(section.querySelectorAll("a")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: "Sell your account" }),
  ).toHaveAttribute("href", "/sell/new?slug=mobile-legends");
  expect(section.textContent).not.toMatch(/\$|USD|price|guarantee|instant/i);
});

it("focuses the section from the teaser and honours reduced motion", async () => {
  vi.mocked(get).mockResolvedValue({ items });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  render(<Harness />);
  const teaser = await screen.findByRole("link", { name: "Wanted accounts ↓" });
  fireEvent.click(teaser);
  expect(screen.getByRole("region", { name: "Wanted accounts" })).toHaveFocus();
  expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
});

for (const [name, setup] of [
  ["loading", () => new Promise(() => {})],
  ["empty", () => Promise.resolve({ items: [] })],
  ["failed", () => Promise.reject(new Error("offline"))],
] as const)
  it(`renders nothing while ${name}`, async () => {
    vi.mocked(get).mockImplementation(setup);
    const { container } = render(<Harness />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("section, a")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

it("validates admin text with the published limits", () => {
  expect(
    wantedIssues({ title: "Legend", description: "", visible: true }),
  ).toEqual([]);
  expect(
    wantedIssues({
      title: "  ",
      description: "a\nb\nc\nd\ne\nf",
      visible: true,
    }).map((issue) => issue.path),
  ).toEqual(["title", "description"]);
  expect(
    wantedIssues({
      title: "é".repeat(80),
      description: "ü".repeat(300),
      visible: false,
    }),
  ).toEqual([]);
  expect(
    wantedIssues({
      title: "é".repeat(81),
      description: "a\r\nb",
      visible: false,
    }).map((issue) => issue.message),
  ).toEqual(["Enter a title of 1–80 characters."]);
});
