import { NewsArticle } from "../news/public";
import { loadArticle } from "../news/loaders.server";
import { articlePath } from "../news/model";
export const loader = loadArticle;
export function headers() {
  return { "Cache-Control": "no-store" };
}
export function meta({
  data,
}: {
  data: Awaited<ReturnType<typeof loadArticle>> | undefined;
}) {
  if (!data)
    return [
      { title: "Article unavailable — PLAYORA" },
      { name: "robots", content: "noindex" },
    ];
  const value = data.article.definition;
  return [
    { title: `${value.title} — PLAYORA` },
    { name: "description", content: value.summary },
    { property: "og:title", content: value.title },
    { property: "og:description", content: value.summary },
    { property: "og:type", content: "article" },
    ...(data.origin
      ? [
          {
            tagName: "link",
            rel: "canonical",
            href: data.origin + articlePath(data.article.game_slug, value.slug),
          },
          {
            property: "og:url",
            content:
              data.origin + articlePath(data.article.game_slug, value.slug),
          },
          ...(value.asset
            ? [{ property: "og:image", content: data.origin + value.asset }]
            : []),
        ]
      : []),
  ];
}
export { NewsError as ErrorBoundary } from "../news/error";
export default NewsArticle;
