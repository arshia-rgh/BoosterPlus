import { loadTerms } from "../site/loaders.server";
import PolicyDocument from "../site/policy-document";
export async function loader({ request }: { request: Request }) {
  const requestedVersion =
    new URL(request.url).searchParams.get("version") ?? "";
  return { ...(await loadTerms(requestedVersion)), requestedVersion };
}
export default function Terms({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <PolicyDocument
      data={loaderData}
      requestedVersion={loaderData.requestedVersion}
    />
  );
}

export { PolicyError as ErrorBoundary } from "../site/policy-error";
