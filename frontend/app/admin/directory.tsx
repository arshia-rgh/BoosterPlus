import { useContext, useState, type ContextType } from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "../validation";
import { AuthorizedIdentity } from "../identity/frame";
import { userSchema } from "../identity/api";
import { Action, ErrorNotice, Text, Select } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { UserControls } from "./user-controls";
const pageSchema = z.object({ users: z.array(userSchema), next: z.string() });
function DirectoryView({
  identity,
}: {
  identity: NonNullable<ContextType<typeof AuthorizedIdentity>>;
}) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [state, setState] = useState(params.get("state") ?? "");
  const [role, setRole] = useState(params.get("role") ?? "");
  const filters = JSON.stringify([
    params.get("search"),
    params.get("state"),
    params.get("role"),
  ]);
  const [previous, setPrevious] = useState(filters);
  if (previous !== filters) {
    setPrevious(filters);
    setSearch(params.get("search") ?? "");
    setState(params.get("state") ?? "");
    setRole(params.get("role") ?? "");
  }
  const query = new URLSearchParams({
    search: params.get("search") ?? "",
    state: params.get("state") ?? "",
    role: params.get("role") ?? "",
    after: params.get("after") ?? "",
  });
  const resource = useResource(`/admin/users?${query.toString()}`, pageSchema);
  return (
    <section className="staff-directory">
      <Link to="/admin">← Operations overview</Link>
      <h2>Customers & staff</h2>
      <p>
        Search verified identities in pages of 50. Directory access is audited.
        Only owners can assign roles.
      </p>
      <p>
        Sensitive changes require recent verification in{" "}
        <Link
          target="_blank"
          rel="noopener noreferrer"
          to="/admin/account/security?returnTo=%2Fadmin%2Fcustomers"
        >
          admin security in a new tab, then return here
        </Link>
        .
      </p>
      <form
        className="orders-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ search, state, role });
        }}
      >
        <Text
          label="Search email, display name or full user ID"
          value={search}
          change={setSearch}
        />
        <Select
          label="Account state"
          value={state}
          change={setState}
          options={[
            ["", "All accounts"],
            ["active", "Active"],
            ["suspended", "Suspended"],
            ["deleted", "Erased profiles"],
          ]}
        />
        <Select
          label="Role"
          value={role}
          change={setRole}
          options={[
            ["", "All roles"],
            ["customer", "Customer"],
            ["booster", "Booster"],
            ["administrator", "Administrator"],
            ["owner", "Owner"],
          ]}
        />
        <button className="button" type="submit">
          Load users
        </button>
      </form>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh directory
      </Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading identities…</p>}
      {resource.data && !resource.error && (
        <>
          <p role="status">
            {resource.data.users.length
              ? `${String(resource.data.users.length)} identities in this page`
              : "No matching identities. Adjust the search, role or account state."}
          </p>
          <div className="staff-directory-results">
            {resource.data.users.map((user) => (
              <UserControls
                key={`${user.id}:${user.role}:${String(user.suspended)}`}
                user={user}
                owner={identity.session.capabilities.includes("owner")}
                refresh={async () => {
                  resource.reload();
                  await identity.refresh();
                }}
              />
            ))}
          </div>
          <div className="catalog-actions">
            {params.get("after") && (
              <Link
                to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: "" }).toString()}`}
              >
                First users
              </Link>
            )}
            {resource.data.next && (
              <Link
                to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: resource.data.next }).toString()}`}
              >
                Next users
              </Link>
            )}
          </div>
        </>
      )}
      {identity.session.capabilities.includes("owner") && (
        <Link to="/admin?view=audit">Audit & recovery review</Link>
      )}
    </section>
  );
}

export default function Directory() {
  const identity = useContext(AuthorizedIdentity);
  return identity ? <DirectoryView identity={identity} /> : null;
}
