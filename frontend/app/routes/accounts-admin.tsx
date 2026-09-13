import { AccountInventory } from "../resale/inventory";
import Identity from "../identity/identity";
export function meta() {
  return [{ title: "Account inventory — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Account inventory" capability="admin">
      <AccountInventory />
    </Identity>
  );
}
