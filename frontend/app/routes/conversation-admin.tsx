import Identity from "../identity/identity";
import Thread from "../support/thread";
export function meta() {
  return [{ title: "Manage conversation — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Manage conversation" capability="admin">
      <Thread admin />
    </Identity>
  );
}
