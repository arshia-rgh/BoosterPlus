import Identity from "../identity/identity";
import BoosterHome from "../fulfillment/booster-home";
export function meta() {
  return [{ title: "Your next session — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Your next session" capability="booster">
      <BoosterHome />
    </Identity>
  );
}
