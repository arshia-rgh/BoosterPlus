import Identity from "../identity/identity";
import { SubmissionDetail } from "../submissions/pages";
export function meta() {
  return [{ title: "Review account submission — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Review account submission" capability="admin">
      <SubmissionDetail admin />
    </Identity>
  );
}
