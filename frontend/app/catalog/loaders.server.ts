import { publicAPIHeaders } from "../portal/routing.server";
import { retryTime } from "../ui/retry-time";
import { z } from "../validation";
import { listingSchema, releaseSchema } from "./model";

async function read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  // Authority is server configuration, never a route/query-supplied hostname.
  const origin = process.env.API_ORIGIN ?? "http://127.0.0.1:8080";
  try {
    const response = await fetch(new URL("/api/v1/catalog/" + path, origin), {
      cache: "no-store",
      headers: publicAPIHeaders(),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if ([401, 403, 404].includes(response.status))
      return failure(response.status);
    if (response.status === 429) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses as loader HTTP errors.
      throw Response.json(
        { retry_at: retryTime(response.headers.get("Retry-After")) },
        { status: 429 },
      );
    }
    if (!response.ok) throw new Error("Catalog unavailable");
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof Response) throw error;
    return failure(503);
  }
}
export function loadCatalog(request: Request) {
  return read(
    "games?after=" +
      encodeURIComponent(new URL(request.url).searchParams.get("after") ?? ""),
    listingSchema,
  );
}
export function loadGame(slug: string | undefined) {
  if (!slug || !/^[a-z][a-z0-9-]{0,79}$/.test(slug)) return failure(404);
  return read("games/" + encodeURIComponent(slug), releaseSchema);
}

export async function loadOffering(
  slug: string | undefined,
  key: string | undefined,
  kind: "service" | "package",
) {
  const release = await loadGame(slug);
  const entries =
    kind === "service"
      ? release.configuration.services
      : release.configuration.packages;
  if (!key || !entries.some((entry) => entry.key === key)) return failure(404);
  return release;
}

function failure(status: number): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses to set the document HTTP status; this is its loader contract.
  throw new Response(status === 404 ? "Not found" : "Catalog unavailable", {
    status,
  });
}
