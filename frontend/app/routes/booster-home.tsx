import Identity from "../identity/identity";
import BoosterHome from "../fulfillment/booster-home";
export function meta() {
  return [{ title: "Your work overview — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Your work overview" capability="booster">
      <BoosterHome />
    </Identity>
  );
}
