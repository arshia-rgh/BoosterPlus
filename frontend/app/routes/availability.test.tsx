import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import Page, { meta } from "./availability";
import Unsubscribe, {
  meta as unsubscribeMeta,
} from "./availability-unsubscribe";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../availability/pages", () => ({
  Subscriptions: () => <p>Owned package subscriptions</p>,
}));
vi.mock("../availability/unsubscribe", () => ({
  default: () => <p>Confirm scoped unsubscribe</p>,
}));
it("protects management while keeping scoped unsubscribe accessible without signing in", () => {
  render(
    <>
      <Page />
      <Unsubscribe />
    </>,
  );
  expect(screen.getByRole("region", { name: "account" })).toHaveTextContent(
    "Owned package subscriptions",
  );
  expect(screen.getByText("Confirm scoped unsubscribe")).toBeVisible();
  expect(meta()[0]?.title).toContain("Booster Plus");
  expect(unsubscribeMeta()[0]?.title).toContain("Booster Plus");
});
