import Identity from "../identity/identity";
import { Subscriptions } from "../availability/pages";
export function meta() {
  return [{ title: "Package alerts — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Package alerts" capability="account">
      <Subscriptions />
    </Identity>
  );
}
