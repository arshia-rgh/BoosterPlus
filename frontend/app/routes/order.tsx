import Identity from "../identity/identity";
import OrderDetail from "../orders/detail";
export function meta() {
  return [{ title: "Order details — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Order details" capability="account">
      <OrderDetail />
    </Identity>
  );
}
