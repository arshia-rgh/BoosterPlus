import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Callers explicitly supply the trusted API origin; user input must never set it.
export function createAPIClient(
  baseUrl: string,
  transport: typeof fetch = fetch,
) {
  const url = new URL(baseUrl);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid API origin");
  }
  return createClient<paths>({
    baseUrl: url.origin,
    credentials: "same-origin",
    fetch: transport,
  });
}
