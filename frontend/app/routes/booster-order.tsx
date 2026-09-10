import Identity from "../identity/identity";
import { BoosterOrder } from "../fulfillment/panel";
export function meta() {
  return [{ title: "Assigned order — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Assigned order" capability="booster">
      <BoosterOrder />
    </Identity>
  );
}
