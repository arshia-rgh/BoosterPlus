import Identity from "../identity/identity";
import BackgroundJobs from "../operations/jobs";
export function meta() {
  return [{ title: "Background tasks — Booster Plus" }];
}
export default function Page() {
  return (
    <Identity title="Background tasks" capability="admin">
      <BackgroundJobs />
    </Identity>
  );
}
