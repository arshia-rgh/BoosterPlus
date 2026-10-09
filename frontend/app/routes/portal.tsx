import { portalFromPath } from "../identity/portal";
import { useLocation } from "../portal-router";
import Identity from "../identity/identity";
export default function Portal() {
  const { pathname } = useLocation();
  const view = pathname.endsWith("/settings")
    ? "profile"
    : pathname.endsWith("/security")
      ? "security"
      : pathname.endsWith("/sessions")
        ? "sessions"
        : pathname.endsWith("/recovery")
          ? "recovery"
          : pathname.endsWith("/preferences")
            ? "preferences"
            : "overview";
  const title =
    pathname === "/booster"
      ? "Booster portal"
      : view === "profile"
        ? "Your profile"
        : view === "security"
          ? "Account security"
          : view === "sessions"
            ? "Your sessions"
            : view === "recovery"
              ? "Recovery codes"
              : view === "preferences"
                ? "Your preferences"
                : "Your account";
  return (
    <Identity
      title={title}
      view={view}
      capability={
        pathname === "/booster"
          ? "booster"
          : portalFromPath(pathname) === "customer"
            ? "account"
            : portalFromPath(pathname) === "admin"
              ? "admin"
              : "booster"
      }
    />
  );
}
