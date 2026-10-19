import Identity from "../identity/identity";
import { SupplierLibrary } from "../suppliers/library";
export function meta() {
  return [{ title: "Supplier catalog — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Supplier catalog" capability="admin">
      <SupplierLibrary />
    </Identity>
  );
}
