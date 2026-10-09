import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ContextType,
} from "react";
import { Link, useSearchParams } from "../portal-router";
import { z } from "../validation";
import { AuthorizedIdentity } from "../identity/frame";
import { focusValidationTarget } from "../ui/form-validation";
import { userSchema } from "../identity/api";
import { Action, ErrorNotice, Text, Select } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { UserControls } from "./user-controls";
import StaffInvitation from "./staff-invitation";
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
  const [portalFilter, setPortalFilter] = useState(
    params.get("portal_filter") ?? "",
  );
  const filters = JSON.stringify([
    params.get("search"),
    params.get("state"),
    params.get("role"),
    params.get("portal_filter"),
  ]);
  const [previous, setPrevious] = useState(filters);
  if (previous !== filters) {
    setPrevious(filters);
    setSearch(params.get("search") ?? "");
    setState(params.get("state") ?? "");
    setRole(params.get("role") ?? "");
    setPortalFilter(params.get("portal_filter") ?? "");
  }
  const query = new URLSearchParams({
    search: params.get("search") ?? "",
    state: params.get("state") ?? "",
    role: params.get("role") ?? "",
    portal_filter: params.get("portal_filter") ?? "",
    after: params.get("after") ?? "",
  });
  const resource = useResource(`/admin/users?${query.toString()}`, pageSchema);
  const heading = useRef<HTMLHeadingElement>(null);
  const summaries = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  const [completed, setCompleted] = useState<{
    id: string;
    message: string;
    revision: number;
  } | null>(null);
  useEffect(() => {
    if (resource.loading || pendingFocus.current === null) return;
    const summary = resource.error
      ? null
      : summaries.current.get(pendingFocus.current);
    focusValidationTarget(summary ?? heading.current);
    pendingFocus.current = null;
  }, [resource.loading, resource.data, resource.error]);
  return (
    <section className="staff-directory">
      <Link to="/admin">← Operations overview</Link>
      <h2 ref={heading} tabIndex={-1}>
        Customers & staff
      </h2>
      <p>
        Search verified identities in pages of 50. Directory access is audited.
        Staff access is provisioned separately from customer accounts. Only
        owners can create staff access or change admin roles.
      </p>
      <p>
        If this action needs fresh verification, confirm it in the dialog here.
      </p>
      {identity.session.capabilities.includes("owner") && (
        <StaffInvitation refresh={resource.reload} />
      )}
      <form
        className="orders-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ search, state, role, portal_filter: portalFilter });
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
          label="Workspace"
          value={portalFilter}
          change={setPortalFilter}
          options={[
            ["", "All workspaces"],
            ["customer", "Customer"],
            ["admin", "Admin"],
            ["booster", "Booster"],
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
      {completed && <p role="status">{completed.message}</p>}
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
                key={`${user.id}:${user.role}:${String(user.suspended)}:${completed?.id === user.id ? String(completed.revision) : "0"}`}
                user={user}
                owner={identity.session.capabilities.includes("owner")}
                summaryRef={(element) => {
                  if (element) summaries.current.set(user.id, element);
                  else summaries.current.delete(user.id);
                }}
                refresh={async (message) => {
                  pendingFocus.current = user.id;
                  setCompleted((previous) => ({
                    id: user.id,
                    message: `${user.display_name || user.email}: ${message}`,
                    revision: (previous?.revision ?? 0) + 1,
                  }));
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
