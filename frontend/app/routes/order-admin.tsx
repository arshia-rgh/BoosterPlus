import Identity from "../identity/identity";
import OrderDetail from "../orders/detail";
export function meta() {
  return [{ title: "Manage order — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Manage order" capability="admin">
      <OrderDetail admin />
    </Identity>
  );
}
