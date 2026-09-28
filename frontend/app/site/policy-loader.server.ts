import { loadTerms } from "./loaders.server";
import { policySectionSchema } from "./model";
export async function loadPolicy(request: Request, kind: string | undefined) {
  const valid = policySectionSchema.shape.kind.safeParse(kind);
  if (!valid.success) return missingPolicy();
  const requestedVersion =
    new URL(request.url).searchParams.get("version") ?? "";
  const data = await loadTerms(requestedVersion);
  if (!data.sections.some((section) => section.kind === valid.data))
    return missingPolicy();
  return { data, kind: valid.data, requestedVersion };
}

function missingPolicy(): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses to retain the policy route and HTTP 404.
  throw new Response("Policy not published in the requested version", {
    status: 404,
  });
}
