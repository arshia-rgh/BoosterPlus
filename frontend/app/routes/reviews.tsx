import Identity from "../identity/identity";
import { ReviewList } from "../reviews/pages";
export function meta() {
  return [{ title: "Your purchase reviews — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Your purchase reviews" capability="account">
      <ReviewList />
    </Identity>
  );
}
