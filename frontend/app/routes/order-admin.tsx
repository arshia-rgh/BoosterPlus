import Identity from "../identity/identity";
import OrderDetail from "../orders/detail";
export function meta() {
  return [{ title: "Manage order — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Manage order" capability="admin">
      <OrderDetail admin />
    </Identity>
  );
}
