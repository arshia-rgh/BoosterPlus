import Identity from "../identity/identity";
import Inbox from "../support/inbox";
export function meta() {
  return [{ title: "Support inbox — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Support inbox" capability="admin">
      <Inbox admin />
    </Identity>
  );
}
