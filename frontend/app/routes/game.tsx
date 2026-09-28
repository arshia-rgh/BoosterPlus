import { publicOrigin } from "../brand/share";
export { gameMetadata as meta } from "../catalog/metadata";
import { loadGame } from "../catalog/loaders.server";
import { GamePage } from "../catalog/public";
export async function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return {
    ...(await loadGame(params.slug)),
    public_origin: publicOrigin(process.env.PUBLIC_SITE_ORIGIN),
  };
}
export default GamePage;

export { GameContentError as ErrorBoundary } from "../catalog/game-shell";
