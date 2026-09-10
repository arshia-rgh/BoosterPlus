import Identity from "../identity/identity";
import { AdminCalendar } from "../fulfillment/calendar";
export function meta() {
  return [{ title: "Staff calendars — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Staff calendars" capability="admin">
      <AdminCalendar />
    </Identity>
  );
}
