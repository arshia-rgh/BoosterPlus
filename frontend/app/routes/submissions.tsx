import Identity from "../identity/identity";
import { SubmissionList } from "../submissions/pages";
export function meta() {
  return [{ title: "Your account submissions — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Your account submissions" capability="account">
      <SubmissionList />
    </Identity>
  );
}
