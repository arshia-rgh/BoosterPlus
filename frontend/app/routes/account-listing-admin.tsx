import { InventoryDetail } from "../resale/inventory";
import Identity from "../identity/identity";
export function meta() {
  return [{ title: "Account listing — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Account listing" capability="admin">
      <InventoryDetail />
    </Identity>
  );
}
