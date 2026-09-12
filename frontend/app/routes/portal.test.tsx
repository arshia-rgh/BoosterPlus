import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
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
it("marks preview terms as unsuitable for public launch", () => {
  vi.stubEnv("APP_ENV", undefined);
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "");
  vi.stubEnv("TERMS_VERSION", undefined);
  const data = termsLoader();
  render(<Terms loaderData={data} />);
  expect(
    screen.getByRole("heading", { name: "Development preview account terms" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Public launch requires/)).toBeInTheDocument();
  vi.unstubAllEnvs();
});
it("serves operator-approved text and fails closed in production", () => {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "");
  vi.stubEnv("TERMS_VERSION", "approved-v1");
  expect(() => termsLoader()).toThrow();
  vi.stubEnv("ACCOUNT_TERMS_TEXT", "Approved account terms and privacy text");
  vi.stubEnv("TERMS_VERSION", "development-preview-v1");
  expect(() => termsLoader()).toThrow();
  vi.stubEnv("TERMS_VERSION", "approved-v1");
  const data = termsLoader();
  render(<Terms loaderData={data} />);
  expect(
    screen.getByRole("heading", { name: "Account terms and privacy" }),
  ).toBeInTheDocument();
  vi.unstubAllEnvs();
});
