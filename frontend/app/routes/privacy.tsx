import Identity from "../identity/identity";
import Privacy from "../privacy/pages";
export default function Page() {
  return (
    <Identity title="Your data and privacy" capability="account">
      <Privacy />
    </Identity>
  );
}
