import { loadTerms } from "../site/loaders.server";
export function loader({ request }: { request: Request }) {
  return loadTerms(new URL(request.url).searchParams.get("version") ?? "");
}
export default function Terms({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <main id="main" className="page">
      <title>Account terms | PLAYORA</title>
      <h1>
        {loaderData.preview
          ? "Development preview account terms"
          : "Account terms and privacy"}
      </h1>
      <p>Version: {loaderData.version}</p>
      <div className="legal-text">{loaderData.text}</div>
    </main>
  );
}
