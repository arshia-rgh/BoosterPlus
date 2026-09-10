import Identity from "../identity/identity";
import { BoosterQueue } from "../fulfillment/panel";
export function meta() {
  return [{ title: "Assigned work — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Assigned work" capability="booster">
      <BoosterQueue />
    </Identity>
  );
}
