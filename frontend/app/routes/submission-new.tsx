import Identity from "../identity/identity";
import { NewSubmission } from "../submissions/pages";
export function meta() {
  return [{ title: "Submit an account — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Submit an account" capability="account">
      <NewSubmission />
    </Identity>
  );
}
