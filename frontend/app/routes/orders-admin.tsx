import Identity from "../identity/identity";
import OrderList from "../orders/list";
export function meta() {
  return [{ title: "Order queue — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Order queue" capability="admin">
      <OrderList admin />
    </Identity>
  );
}
