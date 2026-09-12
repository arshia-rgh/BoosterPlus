import Identity from "../identity/identity";
import { AlertDirectory } from "../admin/directories";
export default function Page() {
  return (
    <Identity title="Availability alerts" capability="admin">
      <AlertDirectory />
    </Identity>
  );
}
