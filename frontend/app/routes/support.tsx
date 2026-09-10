import Identity from "../identity/identity";
import Inbox from "../support/inbox";
export function meta() {
  return [{ title: "Support — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Support" capability="account">
      <Inbox />
    </Identity>
  );
}
