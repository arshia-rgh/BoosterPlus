import Identity from "../identity/identity";
import { ReviewDetail } from "../reviews/pages";
export function meta() {
  return [{ title: "Purchase review history — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Purchase review history" capability="account">
      <ReviewDetail />
    </Identity>
  );
}
