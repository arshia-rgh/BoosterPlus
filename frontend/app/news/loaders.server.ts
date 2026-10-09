import { publicAPIHeaders } from "../portal/routing.server";
import { redirect } from "react-router";
import { z } from "../validation";
import { articlePath, publicPageSchema, publicSchema } from "./model";
import { publicOrigin } from "../brand/share";
export async function readNews<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await fetch(
      new URL(
        `/api/v1/${path}`,
        process.env.API_ORIGIN ?? "http://127.0.0.1:8080",
      ),
      {
        cache: "no-store",
        headers: publicAPIHeaders(),
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      },
    );
    if (!response.ok)
      return failure([404, 403, 422].includes(response.status) ? 404 : 503);
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof Response) throw error;
    return failure(503);
  }
}
function failure(status: number): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes loader Responses as HTTP errors.
  throw new Response(
    status === 404 ? "Article unavailable" : "News unavailable",
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function newsQuery(request: Request) {
  const input = new URL(request.url).searchParams;
  const out = new URLSearchParams();
  for (const k of ["q", "kind", "after"]) {
    const v = input.get(k);
    if (v) out.set(k, v);
  }
  return out;
}
export async function loadNews({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string | undefined>;
}) {
  const slug = params.slug;
  if (!slug || !/^[a-z][a-z0-9-]{0,79}$/.test(slug)) return failure(404);
  const query = newsQuery(request);
  return {
    page: await readNews(
      `games/${encodeURIComponent(slug)}/news?${query.toString()}`,
      publicPageSchema,
    ),
    slug,
    origin: publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
  };
}
export async function loadArticle({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string | undefined>;
}) {
  const slug = params.slug,
    article = params.article;
  if (
    !slug ||
    !article ||
    !/^[a-z][a-z0-9-]{0,99}$/.test(article) ||
    !/^[a-z][a-z0-9-]{0,79}$/.test(slug)
  )
    return failure(404);
  const value = await readNews(
    `games/${encodeURIComponent(slug)}/news/${encodeURIComponent(article)}`,
    publicSchema,
  );
  if (value.redirect) {
    const query = newsQuery(request);
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- Only known same-game slugs returned by the server can redirect.
    throw redirect(
      articlePath(slug, value.definition.slug) +
        (query.size ? `?${query.toString()}` : ""),
      { status: 302, headers: { "Cache-Control": "no-store" } },
    );
  }
  let related: z.infer<typeof publicPageSchema>["items"] = [];
  let relatedUnavailable = false;
  try {
    const page = await readNews(
      `games/${encodeURIComponent(slug)}/news?kind=${value.definition.kind}`,
      publicPageSchema,
    );
    related = page.items.filter((v) => v.id !== value.id).slice(0, 3);
  } catch {
    relatedUnavailable = true;
  }
  return {
    article: value,
    related,
    relatedUnavailable,
    origin: publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
  };
}
