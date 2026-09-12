import Identity from "../identity/identity";
import Administration from "../admin/administration";
export default function Admin() {
  return (
    <Identity title="Administration" capability="admin">
      <Administration />
    </Identity>
  );
}
