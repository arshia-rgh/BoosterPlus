import Identity from "../identity/identity";
import { Customers } from "../admin/administration";
export default function Page() {
  return (
    <Identity title="Customers and staff" capability="admin">
      <Customers />
    </Identity>
  );
}
