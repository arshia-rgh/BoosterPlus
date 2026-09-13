import Identity from "../identity/identity";
import CatalogAdmin from "../catalog/admin";
export function meta() {
  return [{ title: "Catalog editor — PLAYORA" }];
}
export default function CatalogEditor() {
  return (
    <Identity title="Catalog editor" capability="admin">
      <CatalogAdmin />
    </Identity>
  );
}
