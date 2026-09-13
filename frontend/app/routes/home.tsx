import { publicOrigin, shareMetadata } from "../brand/share";
import { loadHome } from "../site/loaders.server";
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
        "Your next level starts here. Explore Mobile Legends boosting, custom rank journeys and fixed packages with PLAYORA. Track your order and talk to our team in one place.",
    },
  ];
}
export async function loader() {
  return {
    ...(await loadHome()),
    shareOrigin: publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
  };
}
export default HomePage;
