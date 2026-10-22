// Synthetic admin review. All API calls stay in this in-memory fixture.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import AdminShell from "../../../app/admin/shell";
import { PageHeader } from "../../../app/ui/page-header";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import type { Session } from "../../../app/identity/api";
import { WantedAccountsAdmin } from "../../../app/resale/wanted-admin";
import { fixtureSession } from "../seller-offer/data";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/admin/admin.css";

const session = {
  ...fixtureSession,
  capabilities: ["admin", "owner"],
} as Session;
document.body.dataset.portal = "admin";
const params = new URLSearchParams(location.search),
  stage = params.get("stage") ?? "ready";
const games = [
  ["11111111-1111-4111-8111-111111111111", "mobile-legends", "Mobile Legends"],
  [
    "22222222-2222-4222-8222-222222222222",
    "world-of-warcraft",
    "World of Warcraft",
  ],
].map(([id = "", slug = "", name = ""]) => ({
  id,
  slug,
  name,
  description: "",
  asset: "",
  asset_alt: "",
  paused: false,
  published: true,
  archived: false,
  revision: 1,
}));
type Entry = {
  id: string;
  game_id: string;
  title: string;
  description: string;
  position: number;
  visible: boolean;
  version: number;
  updated_at: string;
};
let sequence = 4800;
const entry = (
  game: string,
  title: string,
  description: string,
  visible: boolean,
): Entry => {
  sequence++;
  return {
    id: `00000000-0000-4000-8000-00000000${String(sequence)}`,
    game_id: game,
    title,
    description,
    position: sequence,
    visible,
    version: 1,
    updated_at: "2026-10-21T09:00:00Z",
  };
};
const mlbb = games[0]?.id ?? "";
let entries: Entry[] =
  stage === "empty"
    ? []
    : stage === "full"
      ? Array.from({ length: 20 }, (_, index) =>
          entry(mlbb, `Synthetic request ${String(index + 1)}`, "", index < 6),
        )
      : [
          entry(
            mlbb,
            "Mythical Glory account with Collector skins",
            "A buyer is looking for a Mythical Glory account in Europe with at least two Collector skins.\nMarksman or mage mains preferred.",
            true,
          ),
          entry(
            mlbb,
            "Any Legend account in Southeast Asia",
            "Most heroes unlocked. Starlight skins are a bonus.",
            true,
          ),
          entry(mlbb, "Account with Ling Collector and 120+ heroes", "", false),
        ];
let conflictPending = stage === "conflict";
const listFor = (game: string) => {
  const row = games.find((value) => value.id === game);
  return {
    game_id: game,
    game_name: row?.name ?? "",
    game_slug: row?.slug ?? "",
    accepting_sales: stage !== "closed",
    limit: 20,
    shown_limit: 6,
    items: entries
      .filter((value) => value.game_id === game)
      .sort((a, b) => a.position - b.position),
  };
};
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.href,
  );
  if (!url.pathname.startsWith("/api/v1/")) return originalFetch(input, init);
  const send = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const path = url.pathname.slice("/api/v1".length);
  if (path.endsWith("/session")) return send(session);
  if (path === "/admin/catalog/games") return send({ games, next: "" });
  if (
    path === "/admin/wanted-accounts" &&
    (!init?.method || init.method === "GET")
  ) {
    if (stage === "error") return send({ code: "fixture_failure" }, 503);
    return send(listFor(url.searchParams.get("game") ?? ""));
  }
  const body = JSON.parse(
    typeof init?.body === "string" ? init.body : "{}",
  ) as Partial<Entry> & { direction?: string; game_id?: string };
  if (conflictPending) {
    conflictPending = false;
    const first = entries[0];
    if (first) {
      first.version++;
      first.title = "Saved by another administrator";
    }
    return send({ code: "wanted_account_conflict" }, 409);
  }
  const shown = (game: string, except = "") =>
    entries.filter((v) => v.game_id === game && v.visible && v.id !== except)
      .length;
  const limit = () =>
    send(
      {
        code: "wanted_account_invalid",
        issues: [
          {
            path: "visible",
            message: "Up to 6 can be shown. Hide another first.",
          },
        ],
      },
      422,
    );
  if (path === "/admin/wanted-accounts") {
    const game = body.game_id ?? "";
    // "race": another administrator showed entries after this page loaded.
    if (body.visible && (stage === "race" || shown(game) >= 6)) return limit();
    const created = entry(
      game,
      (body.title ?? "").trim(),
      (body.description ?? "").trim(),
      !!body.visible,
    );
    entries.push(created);
    return send(created);
  }
  const match = /^\/admin\/wanted-accounts\/([^/]+)(?:\/(move|delete))?$/.exec(
    path,
  );
  const current = entries.find((value) => value.id === match?.[1]);
  if (!match || !current)
    return send({ code: "wanted_account_not_found" }, 404);
  if (body.version !== current.version)
    return send({ code: "wanted_account_conflict" }, 409);
  if (match[2] === "delete") {
    entries = entries.filter((value) => value.id !== current.id);
    return send({ deleted: true });
  }
  if (match[2] === "move") {
    const ordered = listFor(current.game_id).items;
    const index = ordered.indexOf(current);
    const other = ordered[index + (body.direction === "up" ? -1 : 1)];
    if (!other) return send({ code: "wanted_account_conflict" }, 409);
    [current.position, other.position] = [other.position, current.position];
    current.version++;
    return send(listFor(current.game_id));
  }
  if (
    body.visible &&
    !current.visible &&
    shown(current.game_id, current.id) >= 6
  )
    return limit();
  Object.assign(current, {
    title: (body.title ?? "").trim(),
    description: (body.description ?? "").trim(),
    visible: !!body.visible,
    version: current.version + 1,
    updated_at: "2026-10-22T09:00:00Z",
  });
  return send(current);
};
function Page() {
  return (
    <AuthorizedIdentity value={{ session, refresh: async () => {} }}>
      <AdminShell session={session} title="Wanted accounts">
        <main id="main" className="page identity-page" data-portal="admin">
          <PageHeader title="Wanted accounts" eyebrow="Admin workspace" />
          <WantedAccountsAdmin />
        </main>
      </AdminShell>
    </AuthorizedIdentity>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <RouterProvider
    router={createBrowserRouter([
      { path: "/admin/wanted-accounts", element: <Page /> },
    ])}
  />,
);
