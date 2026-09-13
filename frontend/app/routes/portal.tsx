import { useLocation } from "react-router";
import Identity from "../identity/identity";
export default function Portal() {
  const { pathname } = useLocation();
  const view =
    pathname === "/account/settings"
      ? "profile"
      : pathname === "/account/security"
        ? "security"
        : pathname === "/account/preferences"
          ? "preferences"
          : "overview";
  const title =
    pathname === "/booster"
      ? "Booster portal"
      : view === "profile"
        ? "Your profile"
        : view === "security"
          ? "Account security"
          : view === "preferences"
            ? "Your preferences"
            : "Your account";
  return (
    <Identity
      title={title}
      view={view}
      capability={pathname === "/booster" ? "booster" : "account"}
    />
  );
}
