import Identity from "../identity/identity";
import { ArticleEditor } from "../news/editor";
export function meta() {
  return [{ title: "Article editor — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Article editor" capability="admin">
      <ArticleEditor />
    </Identity>
  );
}
