import { useLocation } from "react-router";
import Identity from "../identity/identity";
export default function Portal() {
  const { pathname } = useLocation();
  return (
    <Identity
      title={pathname === "/booster" ? "Booster portal" : "Your account"}
      capability={pathname === "/booster" ? "booster" : "account"}
    />
  );
}
