import Identity from "../identity/identity";
import { ShopProductEditor } from "../shop/editor";
export function meta() {
  return [{ title: "Shop product editor — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Shop product editor" capability="admin">
      <ShopProductEditor />
    </Identity>
  );
}
