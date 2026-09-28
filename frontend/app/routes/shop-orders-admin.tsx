import Identity from "../identity/identity";
import ShopQueue from "../shop/queue";
export function meta() {
  return [{ title: "Shop delivery queue — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Shop delivery queue" capability="admin">
      <ShopQueue />
    </Identity>
  );
}
