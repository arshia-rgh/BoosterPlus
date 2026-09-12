import Identity from "../identity/identity";
import { MediaDirectory } from "../admin/directories";
export default function Page() {
  return (
    <Identity title="Media directory" capability="admin">
      <MediaDirectory />
    </Identity>
  );
}
