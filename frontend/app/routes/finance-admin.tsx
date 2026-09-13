import Identity from "../identity/identity";
import Finance from "../payments/finance";
export function meta() {
  return [{ title: "Finance — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Finance" capability="admin">
      <Finance />
    </Identity>
  );
}
