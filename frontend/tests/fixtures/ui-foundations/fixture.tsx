import { GameCatalog } from "../../../app/catalog/public";
import {
  emptyConfiguration,
  emptyField,
  listingSchema,
  type Service,
} from "../../../app/catalog/model";
import DynamicForm from "../../../app/catalog/dynamic-form";
import { saveConfigurationDraft } from "../../../app/catalog/configuration-draft";
// Test-only fixture: no production route, network mutations or real account data.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  useLoaderData,
  useSearchParams,
  useRouteError,
} from "react-router";
import {
  Button,
  StatusBadge,
  Skeleton,
  TableRegion,
} from "../../../app/ui/primitives";
import { CursorPagination, filterQuery } from "../../../app/ui/list-navigation";
import { RecordShell } from "../../../app/ui/record-shell";
import { Form, Text } from "../../../app/identity/identity";
import { APIError } from "../../../app/identity/api";
import ErrorPage from "../../../app/ui/error-page";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
import "../../../app/experience/experience.css";
import "./fixture.css";
function Components() {
  const [draft, setDraft] = useState("");
  const [complete, setComplete] = useState<(() => void) | null>(null);
  return (
    <main id="main" className="page identity-page fixture-page">
      <h1>Shared interface foundations</h1>
      <p>Isolated test examples. No real data or transactions.</p>
      <nav aria-label="Fixture examples">
        <Link to="/list?path=custom">List navigation</Link>
        <Link to="/games?path=custom">Actual catalog list</Link>
        <Link to="/record?section=messages">Record sections</Link>
      </nav>
      <section aria-labelledby="actions">
        <h2 id="actions">Action variants</h2>
        <div className="fixture-row">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="text">Text action</Button>
          <Button variant="destructive">Remove draft</Button>
          <Button disabled>Unavailable action</Button>
        </div>
      </section>
      <section aria-labelledby="states">
        <h2 id="states">Readable status</h2>
        <div className="fixture-row">
          <StatusBadge>Draft</StatusBadge>
          <StatusBadge tone="positive">Completed</StatusBadge>
          <StatusBadge tone="warning">Needs attention</StatusBadge>
          <StatusBadge tone="danger">Could not complete</StatusBadge>
          <StatusBadge tone="info">In progress</StatusBadge>
        </div>
      </section>
      <section aria-labelledby="loading">
        <h2 id="loading">Loading</h2>
        <Skeleton label="Loading order details…" />
      </section>
      <Form
        title="Profile details"
        label="Save fixture profile"
        success="Fixture profile saved."
        submit={async (data) => {
          await Promise.resolve();
          const name = data.get("display_name");
          if (typeof name !== "string" || name.trim().length < 3) {
            const error = new APIError("Check the highlighted fields.");
            error.issues = [
              {
                path: "display_name",
                message: "Use at least three characters.",
              },
            ];
            throw error;
          }
          await new Promise<void>((resolve) => {
            setComplete(() => resolve);
          });
          setComplete(null);
        }}
      >
        <Text
          name="display_name"
          label="Display name"
          help="This name appears in your own workspace."
        />
        <Text name="note" label="Safe note" required={false} />
      </Form>
      {complete && (
        <Button
          variant="secondary"
          onClick={() => {
            complete();
          }}
        >
          Finish fixture response
        </Button>
      )}
      <section aria-labelledby="comparison">
        <h2 id="comparison">Comparison table</h2>
        <TableRegion label="Example comparison">
          <table>
            <caption>Published service facts — synthetic example</caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Scope</th>
                <th scope="col">Availability</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Custom request</th>
                <td>Reviewed scope before a final quote</td>
                <td>Reviewed manually</td>
                <td>
                  <Button variant="secondary">View example</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </TableRegion>
      </section>
      <label>
        Caller-owned draft
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
        />
      </label>
    </main>
  );
}
function Results() {
  const result = useLoaderData<{ next: string; page: string }>();
  const [params, setParams] = useSearchParams();
  return (
    <main id="main" className="page fixture-page">
      <h1>List example</h1>
      <label>
        Result type
        <select
          value={params.get("path") ?? "custom"}
          onChange={(e) => {
            setParams(filterQuery(params, { path: e.target.value }));
          }}
        >
          <option value="custom">Custom</option>
          <option value="packages">Packages</option>
        </select>
      </label>
      <p>
        Showing {result.page} · {params.get("path")}
      </p>
      <CursorPagination next={result.next} label="Example pages" />
      <Link to="/">Back to components</Link>
    </main>
  );
}
function RecordExample() {
  const [draft, setDraft] = useState("");
  return (
    <main id="main" className="page identity-page fixture-page">
      <RecordShell
        id="EXAMPLE-1"
        title="Order"
        workspace="My account"
        status={<StatusBadge tone="info">In progress</StatusBadge>}
        back={{ to: "/", label: "Components" }}
        sections={[
          { id: "overview", label: "Overview" },
          { id: "messages", label: "Messages" },
        ]}
      >
        {(section) => (
          <>
            <h2>
              {section === "messages" ? "Order messages" : "Order overview"}
            </h2>
            {section === "messages" && (
              <label>
                Message draft
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                  }}
                />
              </label>
            )}
          </>
        )}
      </RecordShell>
    </main>
  );
}
const draftService: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "manual-review-v1",
  rules: [],
  fields: [
    {
      ...emptyField("mode"),
      label: "Play mode",
      required: true,
      options: [
        { key: "solo", label: "Solo", units: 0 },
        { key: "duo", label: "Together", units: 0 },
      ],
    },
  ],
};
const draftConfig = {
  ...emptyConfiguration("Fixture game"),
  services: [draftService],
};
function DraftExample() {
  return (
    <main id="main" className="page identity-page fixture-page">
      <h1>Selection retention</h1>
      <p>
        Test-only example. Choose a play mode, then update another game's saved
        draft. Your choice should remain.
      </p>
      <Button
        onClick={() => {
          saveConfigurationDraft(
            "fixture-release",
            draftService,
            draftConfig,
            "",
            "",
            { mode: "duo" },
          );
          window.dispatchEvent(
            new StorageEvent("storage", { key: "playora.configuration" }),
          );
        }}
      >
        Restore this form's saved draft
      </Button>
      <Button
        onClick={() => {
          saveConfigurationDraft(
            "another-release",
            draftService,
            draftConfig,
            "another-package",
            "standard",
            { mode: "duo" },
          );
          window.dispatchEvent(
            new StorageEvent("storage", { key: "playora.configuration" }),
          );
        }}
      >
        Update unrelated saved draft
      </Button>
      <DynamicForm
        config={draftConfig}
        service={draftService}
        releaseID="fixture-release"
        slug="fixture-game"
      />
    </main>
  );
}
const router = createBrowserRouter([
  { path: "/", Component: Components },
  { path: "/configuration", Component: DraftExample },
  {
    path: "/list",
    Component: Results,
    loader: async ({ request }) => {
      const params = new URL(request.url).searchParams;
      const cursor = params.get("after");
      if (cursor === "second")
        await new Promise((resolve) => {
          setTimeout(resolve, 250);
        });
      return {
        next: cursor ? "" : "second",
        page: cursor ? "second page" : "first page",
      };
    },
  },
  {
    path: "/games",
    Component: GameCatalog,
    ErrorBoundary: () => <ErrorPage error={useRouteError()} />,
    loader: ({ request }) => {
      const after = new URL(request.url).searchParams.get("after");
      if (after === "unavailable")
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses to exercise its actual loader failure boundary.
        throw new Response("Private fixture detail", { status: 503 });
      return listingSchema.parse({
        games: [
          {
            id: after ? "second" : "first",
            slug: after ? "second-game" : "first-game",
            name: after ? "Second fixture game" : "First fixture game",
            description: "Read-only catalog example.",
            asset: "",
            asset_alt: "",
            paused: false,
            published: true,
            archived: false,
            revision: 1,
          },
        ],
        next: after ? "" : "second",
      });
    },
  },
  { path: "/record", Component: RecordExample },
  {
    path: "/themed-record",
    element: (
      <div className="experience">
        <RecordExample />
      </div>
    ),
  },
  {
    path: "*",
    element: (
      <ErrorPage
        error={{
          status: 404,
          statusText: "Not found",
          internal: false,
          data: null,
        }}
      />
    ),
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
