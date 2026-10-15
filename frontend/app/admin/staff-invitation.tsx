import { Confirmation } from "../ui/form-validation";
import { useState } from "react";
import { Link } from "../portal-router";
import { APIError, post, userSchema, type User } from "../identity/api";
import { Form, Text, value } from "../identity/identity";

/** Provisioning creates an independent realm identity; it never sends email. */
export default function StaffInvitation({ refresh }: { refresh: () => void }) {
  const [portal, setPortal] = useState<"admin" | "booster">("booster");
  const [created, setCreated] = useState<User | null>(null);
  return (
    <section className="identity-section" aria-label="Create staff access">
      <Form
        title="Add a staff account"
        label="Create staff access"
        success="Staff access created. No invitation email was sent."
        submit={async (data) => {
          const role = portal === "admin" ? "administrator" : "booster";
          setCreated(null);
          const account = await post(
            "/admin/staff/invitations",
            {
              email: value(data, "email"),
              portal,
              role,
              display_name: value(data, "display_name"),
            },
            userSchema,
          );
          if (account.portal !== portal || account.role !== role)
            throw new APIError(
              "The returned account did not match this invitation. Refresh the directory before trying again.",
            );
          setCreated(account);
          refresh();
        }}
      >
        <p>
          Create a separate admin or booster identity. The same email may
          already have a customer account; its profile, authenticator, sessions
          and permissions remain independent.
        </p>
        <Text
          name="email"
          label="Staff email address"
          type="email"
          autoComplete="off"
        />
        <Text
          name="display_name"
          label="Display name (optional)"
          required={false}
          maxLength={100}
          autoComplete="off"
        />
        <label>
          Workspace
          <select
            name="portal"
            value={portal}
            onChange={(event) => {
              setPortal(event.target.value === "admin" ? "admin" : "booster");
              setCreated(null);
            }}
          >
            <option value="booster">Booster workspace</option>
            <option value="admin">Admin workspace</option>
          </select>
        </label>
        <p>
          {portal === "admin"
            ? "Administrators receive admin workspace access. This does not grant the owner role."
            : "Boosters receive booster workspace access. This does not grant admin access."}
        </p>
        <p>
          Only an owner can create staff access. If needed, a dialog asks for an
          authenticator or email code before creating the account.
        </p>
        <Confirmation>Create this independent staff account</Confirmation>
      </Form>
      {created && (
        <div className="account-panel" role="status">
          <h3>
            {created.portal === "admin" ? "Admin" : "Booster"} account ready for
            first sign-in
          </h3>
          <p>{created.email}</p>
          <p>
            Share the workspace sign-in address through your established staff
            channel. They must verify that email or Google account and set up a
            separate authenticator before accessing staff work.
          </p>
          <Link
            to={created.portal === "admin" ? "/admin/login" : "/booster/login"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the {created.portal} sign-in page in a new tab
          </Link>
          <details>
            <summary>Account reference</summary>
            <p>{created.id}</p>
          </details>
        </div>
      )}
    </section>
  );
}
