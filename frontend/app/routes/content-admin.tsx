import Identity from "../identity/identity";
import ContentEditor from "../site/editor";
export default function Page() {
  return (
    <Identity title="Content and policies" capability="admin">
      <ContentEditor />
    </Identity>
  );
}
