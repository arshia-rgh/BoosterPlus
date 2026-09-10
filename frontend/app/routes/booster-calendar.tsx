import Identity from "../identity/identity";
import { BoosterCalendar } from "../fulfillment/calendar";
export function meta() {
  return [{ title: "Your staff calendar — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Your staff calendar" capability="booster">
      <BoosterCalendar />
    </Identity>
  );
}
