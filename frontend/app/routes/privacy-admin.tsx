import Identity from "../identity/identity";
import Privacy from "../privacy/pages";
export default function Page() {
  return (
    <Identity title="Privacy requests" capability="owner">
      <Privacy admin />
    </Identity>
  );
}
