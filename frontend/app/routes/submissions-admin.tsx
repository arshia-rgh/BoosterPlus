import Identity from "../identity/identity";
import { SubmissionList } from "../submissions/pages";
export function meta() {
  return [{ title: "Account submissions — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Account submissions" capability="admin">
      <SubmissionList admin />
    </Identity>
  );
}
