import Identity from "../identity/identity";
import OrderList from "../orders/list";
export function meta() {
  return [{ title: "My orders — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="My orders" capability="account">
      <OrderList />
    </Identity>
  );
}
