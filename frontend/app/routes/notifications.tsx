import Identity from "../identity/identity";
import Notifications from "../support/notifications";
export function meta() {
  return [{ title: "Account activity — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Account activity" capability="account">
      <Notifications />
    </Identity>
  );
}
