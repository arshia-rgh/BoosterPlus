import Identity from "../identity/identity";
import { Articles } from "../news/list";
export function meta() {
  return [{ title: "Articles — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Articles" capability="admin">
      <Articles />
    </Identity>
  );
}
