import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Content from "./content-admin";
import PrivacyAdmin from "./privacy-admin";
import Privacy from "./privacy";
import Media from "./media-admin";
import Alerts from "./alerts-admin";
import Customers from "./customers-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    title,
    capability,
    children,
  }: {
    title: string;
    capability: string;
    children: ReactNode;
  }) => (
    <>
      <h1>
        {title} {capability}
      </h1>
      {children}
    </>
  ),
}));
vi.mock("../site/editor", () => ({ default: () => null }));
vi.mock("../privacy/pages", () => ({
  default: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Owner review" : "Own privacy"}</p>
  ),
}));
vi.mock("../admin/directories", () => ({
  MediaDirectory: () => null,
  AlertDirectory: () => null,
}));
vi.mock("../admin/administration", () => ({ Customers: () => null }));
afterEach(cleanup);
for (const [Page, title] of [
  [Content, "Content and policies admin"],
  [PrivacyAdmin, "Privacy requests owner"],
  [Privacy, "Your data and privacy account"],
  [Media, "Media directory admin"],
  [Alerts, "Availability alerts admin"],
  [Customers, "Customers and staff admin"],
] as const) {
  it("guards " + title, () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });
}
