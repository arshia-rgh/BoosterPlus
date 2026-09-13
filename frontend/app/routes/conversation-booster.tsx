import Identity from "../identity/identity";
import Thread from "../support/thread";
export function meta() {
  return [{ title: "Assigned coordination — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Assigned coordination" capability="booster">
      <Thread booster />
    </Identity>
  );
}
