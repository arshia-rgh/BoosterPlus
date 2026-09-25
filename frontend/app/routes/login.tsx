import { useLocation } from "react-router";
import Identity from "../identity/identity";
import { portalFromPath } from "../identity/portal";
export default function Login() {
  const portal = portalFromPath(useLocation().pathname);
  return (
    <Identity
      title="Sign in"
      view="overview"
      capability={portal === "customer" ? "account" : portal}
    />
  );
}
