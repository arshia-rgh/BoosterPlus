import Identity from "../identity/identity";
import { SubmissionDetail } from "../submissions/pages";
export function meta() {
  return [{ title: "Account submission — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Account submission" capability="account">
      <SubmissionDetail />
    </Identity>
  );
}
