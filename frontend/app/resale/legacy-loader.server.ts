import { publicAPIHeaders } from "../portal/routing.server";
import { redirect } from "react-router";
import { publicListingSchema } from "./model";

/** Resolve only a public listing; never forward cookies or arbitrary return URLs. */
export async function legacyAccountLoader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string | undefined>;
}) {
  const id = params.id ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  )
    return unavailable(404);
  try {
    const response = await fetch(
      new URL(
        `/api/v1/accounts/${id}`,
        process.env.API_ORIGIN ?? "http://127.0.0.1:8080",
      ),
      {
        cache: "no-store",
        headers: publicAPIHeaders(),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return unavailable(response.status === 404 ? 404 : 503);
    const listing = publicListingSchema.parse(await response.json());
    if (listing.id !== id || !/^[a-z][a-z0-9-]{0,79}$/.test(listing.slug))
      return unavailable(503);
    const input = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    if (input.get("step") === "review") query.set("step", "review");
    const reference = input.get("request");
    if (
      reference &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        reference,
      )
    )
      query.set("request", reference);
    return redirect(
      `/games/${listing.slug}/accounts/${id}${query.size ? `?${query}` : ""}`,
      {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    return unavailable(503);
  }
}
function unavailable(status: number): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes Responses as contextual route errors.
  throw new Response("Account listing unavailable", {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
