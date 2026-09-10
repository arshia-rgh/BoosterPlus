import Identity from "../identity/identity";
import { ReviewDetail } from "../reviews/pages";
export function meta() {
  return [{ title: "Moderate purchase review — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Moderate purchase review" capability="admin">
      <ReviewDetail admin />
    </Identity>
  );
}
