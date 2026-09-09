import { useLocation } from "react-router";
import Identity from "../identity/identity";
export default function Portal() {
  const { pathname } = useLocation();
  return (
    <Identity
      title={
        pathname === "/admin"
          ? "Administration"
          : pathname === "/booster"
            ? "Booster portal"
            : "Your account"
      }
      capability={
        pathname === "/admin"
          ? "admin"
          : pathname === "/booster"
            ? "booster"
            : "account"
      }
    />
  );
}
