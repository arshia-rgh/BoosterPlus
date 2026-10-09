import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi, afterEach } from "vitest";
import Portal from "./portal";
import Login from "./login";
import Terms, { loader as termsLoader } from "./terms";
vi.mock("../identity/identity", () => ({
  default: ({ title, capability }: { title: string; capability?: string }) => (
    <h1>
      {title} {capability}
    </h1>
  ),
}));
for (const [path, title, capability] of [
  ["/account", "Your account", "account"],
  ["/account/settings", "Your profile", "account"],
  ["/account/security", "Account security", "account"],
  ["/account/preferences", "Your preferences", "account"],
  ["/booster", "Booster portal", "booster"],
  ["/admin/account/sessions", "Your sessions", "admin"],
  ["/admin/account/recovery", "Recovery codes", "admin"],
  ["/booster/account/sessions", "Your sessions", "booster"],
  ["/booster/account/recovery", "Recovery codes", "booster"],
  ["/admin/account/settings", "Your profile", "admin"],
  ["/admin/account/security", "Account security", "admin"],
  ["/admin/account/preferences", "Your preferences", "admin"],
  ["/booster/account/settings", "Your profile", "booster"],
  ["/booster/account/security", "Account security", "booster"],
  ["/booster/account/preferences", "Your preferences", "booster"],
] as const) {
  it(`selects the ${path} permission boundary`, () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Portal />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: title + " " + capability }),
    ).toBeInTheDocument();
  });
}
it("renders the sign-in entry", () => {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Sign in account" }),
  ).toBeInTheDocument();
});
it("marks preview terms as unsuitable for public launch", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "legal",
          version: 0,
          release_id: "",
          label: "",
          data: {},
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
    ),
  );
  vi.stubEnv("APP_ENV", undefined);
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "");
  vi.stubEnv("TERMS_VERSION", undefined);
  const data = await termsLoader({
    request: new Request("http://localhost/terms"),
  });
  render(<Terms loaderData={data} />);
  expect(
    screen.getByRole("heading", { name: "Development preview account terms" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Public launch requires/)).toBeInTheDocument();
  vi.unstubAllEnvs();
});
it("serves operator-approved text and fails closed in production", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            kind: "legal",
            version: 0,
            release_id: "",
            label: "",
            data: {},
            updated_at: "2026-01-01T00:00:00Z",
          }),
        ),
      ),
    ),
  );
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "");
  vi.stubEnv("TERMS_VERSION", "approved-v1");
  await expect(
    termsLoader({ request: new Request("http://localhost/terms") }),
  ).rejects.toThrow();
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "Approved account terms and privacy text");
  vi.stubEnv("TERMS_VERSION", "development-preview-v1");
  await expect(
    termsLoader({ request: new Request("http://localhost/terms") }),
  ).rejects.toThrow();
  vi.stubEnv("TERMS_VERSION", "approved-v1");
  const data = await termsLoader({
    request: new Request("http://localhost/terms"),
  });
  render(<Terms loaderData={data} />);
  expect(
    screen.getByRole("heading", { name: "Account terms and privacy" }),
  ).toBeInTheDocument();
  vi.unstubAllEnvs();
});

afterEach(() => vi.unstubAllGlobals());

it("loads a named immutable legal version", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "legal",
          version: 2,
          release_id: "published",
          label: "v2",
          data: {
            text: "Historical published terms",
            sections: [
              {
                kind: "privacy",
                title: "Historical privacy",
                text: "Approved historical privacy details.",
              },
            ],
          },
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
    ),
  );
  const historical = await termsLoader({
    request: new Request("http://localhost/terms?version=v2"),
  });
  expect(historical.version).toBe("v2");
  render(<Terms loaderData={historical} />);
  expect(
    screen.getByRole("heading", { name: "Historical privacy" }),
  ).toBeInTheDocument();
});
