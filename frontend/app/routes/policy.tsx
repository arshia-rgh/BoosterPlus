import { loadPolicy } from "../site/policy-loader.server";
import PolicyDocument from "../site/policy-document";
export function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string | undefined>;
}) {
  return loadPolicy(request, params.kind);
}
export default function Policy({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return <PolicyDocument {...loaderData} />;
}

export { PolicyError as ErrorBoundary } from "../site/policy-error";
