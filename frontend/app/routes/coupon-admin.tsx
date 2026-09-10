import Identity from "../identity/identity";
import Coupons from "../catalog/coupons";
export function meta() {
  return [{ title: "Coupons — Booster Plus" }];
}
export default function CouponAdmin() {
  return (
    <Identity title="Coupons" capability="admin">
      <Coupons />
    </Identity>
  );
}
