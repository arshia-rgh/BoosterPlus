import { publicOrigin } from "../brand/share";
import { readNews } from "../news/loaders.server";
import { z } from "../validation";
import { articlePath } from "../news/model";
const schema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z][a-z0-9-]{0,99}$/),
        updated_at: z.string(),
      }),
    )
    .max(50000),
});
const xml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export async function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const origin = publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
    slug = params.slug;
  if (!origin)
    return new Response("Public site origin is not configured", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  if (!slug || !/^[a-z][a-z0-9-]{0,79}$/.test(slug))
    return new Response("Not found", { status: 404 });
  const page = await readNews(
    `games/${encodeURIComponent(slug)}/news-sitemap`,
    schema,
  );
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      page.items
        .map(
          (v) =>
            `<url><loc>${xml(origin + articlePath(slug, v.slug))}</loc><lastmod>${xml(v.updated_at)}</lastmod></url>`,
        )
        .join("") +
      "</urlset>",
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
