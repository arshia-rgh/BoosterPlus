import { NewsIndex } from "../news/public";
import { loadNews } from "../news/loaders.server";
export const loader = loadNews;
export function headers() {
  return { "Cache-Control": "no-store" };
}
export function meta({
  data,
}: {
  data: Awaited<ReturnType<typeof loadNews>> | undefined;
}) {
  return [
    { title: "News & guides — PLAYORA" },
    ...(!data
      ? [{ name: "robots", content: "noindex" }]
      : data.origin
        ? [
            {
              tagName: "link",
              rel: "canonical",
              href: `${data.origin}/games/${data.slug}/news`,
            },
          ]
        : []),
  ];
}
export { NewsError as ErrorBoundary } from "../news/error";
export default NewsIndex;
