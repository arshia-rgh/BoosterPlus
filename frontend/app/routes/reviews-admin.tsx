import Identity from "../identity/identity";
import { ReviewList } from "../reviews/pages";
export function meta() {
  return [{ title: "Review moderation — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Review moderation" capability="admin">
      <ReviewList admin />
    </Identity>
  );
}
