import { Anchor } from "../portal-router";
import {
  isRouteErrorResponse,
  useLocation,
  useParams,
  useRevalidator,
  useRouteError,
} from "../portal-router";
import { policySectionSchema } from "./model";
import "./public-info.css";
export function PolicyError() {
  const error = useRouteError(),
    location = useLocation(),
    params = useParams(),
    retry = useRevalidator();
  const parsed = policySectionSchema.shape.kind.safeParse(params.kind);
  const current = parsed.success ? `/policies/${parsed.data}` : "/terms";
  const version = new URLSearchParams(location.search).get("version");
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" className="page public-info">
      <title>Policy unavailable | PLAYORA</title>
      <meta name="robots" content="noindex,nofollow" />
      <p className="eyebrow">TERMS & POLICIES</p>
      <h1>This policy is unavailable.</h1>
      <p role="status">
        {missing
          ? "This section is not published in the requested version, or the policy address is unknown."
          : "We could not load the requested policy. Please try again; no substitute policy is shown."}
      </p>
      {version && <p>Requested version: {version.slice(0, 64)}</p>}
      <div className="catalog-actions">
        <button
          className="button"
          type="button"
          disabled={retry.state !== "idle"}
          onClick={() => {
            void retry.revalidate();
          }}
        >
          Retry this policy
        </button>
        <Anchor href={current}>Current policy</Anchor>
        <Anchor href="/terms">All terms & policies</Anchor>
        <Anchor href="/contact">Contact support</Anchor>
      </div>
    </main>
  );
}
