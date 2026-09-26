import { publicOrigin, shareMetadata } from "../brand/share";
import { loadHome } from "../site/loaders.server";
import { loadCatalog } from "../catalog/loaders.server";
import { HomePage } from "../home/page";

export function meta({
  data,
}: { data?: Awaited<ReturnType<typeof loader>> } = {}) {
  return [
    { title: "PLAYORA — Game boosting & accounts" },
    ...shareMetadata(data?.shareOrigin ?? null),
    {
      name: "description",
      content:
        "Explore PLAYORA game services, custom boosting, fixed packages and reviewed accounts. Choose your game and discover what is available.",
    },
  ];
}
export async function loader() {
  const [content, catalog] = await Promise.all([
    loadHome(),
    loadCatalog(new Request("https://playora.invalid/games")).catch(() => null),
  ]);
  return {
    ...content,
    catalog,
    shareOrigin: publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
  };
}
export default HomePage;
