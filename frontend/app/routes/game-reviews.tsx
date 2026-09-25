import { loadReviews } from "../reviews/loaders.server";
import PublicReviews from "../reviews/public";
export function meta() {
  return [{ title: "Customer reviews — PLAYORA" }];
}
export function loader({
  params,
  request,
}: {
  params: Record<string, string | undefined>;
  request: Request;
}) {
  return loadReviews(params.slug, request);
}
export default PublicReviews;

export { GameContentError as ErrorBoundary } from "../catalog/game-shell";
