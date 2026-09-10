import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Support, { meta as supportMeta } from "./support";
import Conversation, { meta as conversationMeta } from "./conversation";
import AdminSupport, { meta as adminMeta } from "./support-admin";
import AdminConversation, {
  meta as adminConversationMeta,
} from "./conversation-admin";
import BoosterConversation, {
  meta as boosterMeta,
} from "./conversation-booster";
import Notifications, { meta as noticesMeta } from "./notifications";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../support/inbox", () => ({
  default: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Staff inbox" : "My conversations"}</p>
  ),
}));
vi.mock("../support/thread", () => ({
  default: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Staff thread" : "Customer thread"}</p>
  ),
}));
vi.mock("../support/notifications", () => ({
  default: () => <p>Private notices</p>,
}));
it("uses explicit customer and staff identity boundaries for support routes", () => {
  for (const meta of [
    supportMeta,
    conversationMeta,
    adminMeta,
    adminConversationMeta,
    noticesMeta,
    boosterMeta,
  ])
    expect(meta()[0]?.title).toContain("Booster Plus");
  render(
    <>
      <Support />
      <Conversation />
      <AdminSupport />
      <AdminConversation />
      <Notifications />
      <BoosterConversation />
    </>,
  );
  expect(screen.getByRole("region", { name: "booster" })).toHaveTextContent(
    "Customer thread",
  );
  expect(screen.getAllByRole("region", { name: "account" })).toHaveLength(3);
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(
    screen.getByText("Staff thread").closest("section"),
  ).toHaveAccessibleName("admin");
});
