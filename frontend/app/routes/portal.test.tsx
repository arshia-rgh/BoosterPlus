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
  ["/booster", "Booster portal", "booster"],
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
  render(<Login />);
  expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
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
          data: { text: "Historical published terms" },
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
    ),
  );
  expect(
    (
      await termsLoader({
        request: new Request("http://localhost/terms?version=v2"),
      })
    ).version,
  ).toBe("v2");
});
