import Identity from "../identity/identity";
import { ShopProducts } from "../shop/list";
export function meta() {
  return [{ title: "Shop products — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Shop products" capability="admin">
      <ShopProducts />
    </Identity>
  );
}
