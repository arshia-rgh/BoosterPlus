import Identity from "../identity/identity";
import Thread from "../support/thread";
export function meta() {
  return [{ title: "Conversation — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Conversation" capability="account">
      <Thread />
    </Identity>
  );
}
