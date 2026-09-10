import Identity from "../identity/identity";
import Favorites from "../orders/favorites";
export function meta() {
  return [{ title: "Favorites — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Favorites" capability="account">
      <Favorites />
    </Identity>
  );
}
