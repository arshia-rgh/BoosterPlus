import Identity from "../identity/identity";
import Reports from "../reports/pages";
export function meta() {
  return [{ title: "Operational reports — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Operational reports" capability="admin">
      <Reports />
    </Identity>
  );
}
