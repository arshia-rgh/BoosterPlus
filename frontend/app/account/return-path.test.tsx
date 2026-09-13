import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import {
  safeReturnPath,
  SignInReturn,
  rememberGoogleReturn,
  clearGoogleReturn,
  VerificationReturn,
} from "./return-path";
afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("only permits local known task paths and drops query data", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/api/v1/auth/logout",
    "/account/../../evil",
    "javascript:alert(1)",
    "/orders\n",
  ])
    expect(safeReturnPath(path)).toBeNull();
  expect(safeReturnPath("/orders/owned?email=private#section")).toBe(
    "/orders/owned",
  );
});
function Location() {
  return <p>{useLocation().pathname}</p>;
}

it("returns Google re-verification to security with a safe manual task link", async () => {
  rememberGoogleReturn("/account/security", "/admin/orders?customer=private");
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <SignInReturn ready />
      <VerificationReturn />
      <Location />
    </MemoryRouter>,
  );
  await screen.findByText("/account/security");
  expect(
    screen.getByRole("link", { name: "Return to your task ↗" }),
  ).toHaveAttribute("href", "/admin/orders");
});
it("waits for MFA/recovery acknowledgment before returning from Google and consumes the path", async () => {
  rememberGoogleReturn("/orders");
  const view = render(
    <MemoryRouter initialEntries={["/account"]}>
      <SignInReturn ready={false} />
      <Location />
    </MemoryRouter>,
  );
  expect(screen.getByText("/account")).toBeInTheDocument();
  view.rerender(
    <MemoryRouter initialEntries={["/account"]}>
      <SignInReturn ready />
      <Location />
    </MemoryRouter>,
  );
  await screen.findByText("/orders");
  expect(sessionStorage.getItem("playora.google-return")).toBeNull();
});
it("opens the independent staff application with document navigation", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { assign });
  rememberGoogleReturn("/admin/orders");
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <SignInReturn ready />
      <Location />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(assign).toHaveBeenCalledExactlyOnceWith("/admin/orders");
  });
  expect(screen.getByText("/account")).toBeInTheDocument();
  expect(sessionStorage.getItem("playora.google-return")).toBeNull();
});
it("ignores expired return data and tolerates blocked storage", async () => {
  sessionStorage.setItem(
    "playora.google-return",
    JSON.stringify({ path: "/orders", expires: 0 }),
  );
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <SignInReturn ready />
      <Location />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(sessionStorage.getItem("playora.google-return")).toBeNull();
  });
  expect(screen.getByText("/account")).toBeInTheDocument();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => {
    rememberGoogleReturn("/orders");
  }).not.toThrow();
  expect(() => {
    clearGoogleReturn();
  }).not.toThrow();
});
