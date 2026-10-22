import Identity from "../identity/identity";
import { WantedAccountsAdmin } from "../resale/wanted-admin";
export function meta() {
  return [{ title: "Wanted accounts — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Wanted accounts" capability="admin">
      <WantedAccountsAdmin />
    </Identity>
  );
}
