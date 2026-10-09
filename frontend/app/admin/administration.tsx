import { Link, useSearchParams } from "../portal-router";
import { useContext } from "react";
import { AuthorizedIdentity } from "../identity/frame";
import OperationsOverview from "../operations/overview";
import Directory from "./directory";
import Governance from "./governance";
export default function AdministrationEntry() {
  const identity = useContext(AuthorizedIdentity);
  const [params] = useSearchParams();
  if (!identity) return null;
  return (
    <>
      <nav className="catalog-actions" aria-label="Administration views">
        <Link to="/admin">Operations overview</Link>
        <Link to="/admin/customers">Customers & staff</Link>
        {identity.session.capabilities.includes("owner") && (
          <Link to="/admin?view=audit">Audit & recovery review</Link>
        )}
      </nav>
      {params.get("view") === "audit" ? <Governance /> : <OperationsOverview />}
    </>
  );
}
export function Customers() {
  return <Directory />;
}
