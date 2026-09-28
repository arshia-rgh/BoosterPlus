import { loadHome } from "../site/loaders.server";
import HowItWorks from "../site/how-it-works";
export const loader = loadHome;
export default function Information({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return <HowItWorks content={loaderData} />;
}
