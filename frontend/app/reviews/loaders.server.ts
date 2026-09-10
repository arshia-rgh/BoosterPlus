import { feedSchema } from "./model";
export async function loadReviews(slug: string | undefined, request: Request) {
  if (!slug || !/^[a-z][a-z0-9-]{0,79}$/.test(slug)) return failure(404);
  const supplied = new URL(request.url).searchParams,
    params = new URLSearchParams();
  for (const key of ["service", "package", "after"]) {
    const value = supplied.get(key);
    if (value) params.set(key, value);
  }
  try {
    const response = await fetch(
      new URL(
        `/api/v1/public/reviews/${encodeURIComponent(slug)}?${params.toString()}`,
        process.env.API_ORIGIN ?? "http://127.0.0.1:8080",
      ),
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (response.status === 404) return failure(404);
    if (!response.ok) throw new Error("Reviews unavailable");
    return feedSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof Response) throw error;
    return failure(503);
  }
}
function failure(status: number): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses as the loader HTTP status.
  throw new Response(status === 404 ? "Not found" : "Reviews unavailable", {
    status,
  });
}
