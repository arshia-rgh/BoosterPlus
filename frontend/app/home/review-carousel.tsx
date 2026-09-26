import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { z } from "../validation";
import { publicReviewSchema } from "../reviews/model";
import { useResource } from "../orders/resource";
import { useMotionPreference } from "../ui/motion";
const showcaseSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string(),
        game: z.string(),
        review: publicReviewSchema,
      }),
    )
    .max(8),
});
export default function ReviewCarousel() {
  const resource = useResource("/public/reviews", showcaseSchema);
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [announcement, setAnnouncement] = useState("");
  const motion = useMotionPreference();
  const items = resource.data?.items ?? [];
  const update = useCallback(() => {
    const element = track.current;
    setEdges({
      start: !element || element.scrollLeft < 2,
      end:
        !element ||
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    });
  }, []);
  useEffect(() => {
    update();
    const element = track.current;
    if (!element || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [items.length, update]);
  const move = (direction: number) => {
    const element = track.current;
    const first = element?.firstElementChild;
    if (!element || !first) return;
    element.scrollBy({
      left: direction * (first.getBoundingClientRect().width + 20),
      behavior: motion === "system-full" ? "smooth" : "instant",
    });
    setAnnouncement(
      direction > 0 ? "Moving to later reviews." : "Moving to earlier reviews.",
    );
  };
  return (
    <section
      className="home-content-width home-reviews"
      aria-labelledby="community-title"
    >
      <div className="home-section-heading">
        <div>
          <p className="home-kicker">FROM OUR COMMUNITY</p>
          <h2 id="community-title">
            Real experiences.
            <br />
            <em>In their words.</em>
          </h2>
        </div>
        <p>Recent published customer feedback. Every rating is welcome.</p>
      </div>
      {resource.loading && !resource.data && (
        <p role="status">Loading published reviews…</p>
      )}
      {resource.error ? (
        <div className="discovery-empty">
          <p>Reviews are temporarily unavailable.</p>
          <button
            type="button"
            className="button"
            onClick={resource.reload}
            disabled={resource.loading}
          >
            {resource.loading ? "Loading…" : "Try reviews again"}
          </button>
        </div>
      ) : items.length ? (
        <>
          <div className="review-carousel-controls">
            <button
              type="button"
              aria-label="Previous reviews"
              aria-controls="review-track"
              disabled={edges.start}
              onClick={() => {
                move(-1);
              }}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next reviews"
              aria-controls="review-track"
              disabled={edges.end}
              onClick={() => {
                move(1);
              }}
            >
              →
            </button>
          </div>
          <ul
            className="review-track"
            id="review-track"
            ref={track}
            onScroll={update}
            aria-label="Recent published reviews"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The horizontal scroll region needs keyboard focus for native arrow scrolling.
            tabIndex={0}
          >
            {items.map((item) => (
              <li key={item.review.id}>
                <div className="review-card-top">
                  <span>{item.game}</span>
                  <strong>{item.review.rating} / 5</strong>
                </div>
                <p className="review-card-origin">
                  Customer feedback ·{" "}
                  <time dateTime={item.review.published_at}>
                    {new Date(item.review.published_at).toLocaleDateString(
                      "en-GB",
                      { timeZone: "UTC" },
                    )}
                  </time>
                </p>
                <blockquote>{item.review.body}</blockquote>
                {item.review.purchase_status !== "verified_purchase" && (
                  <p className="review-status-note">
                    Purchase status changed after this feedback was submitted.
                    See the review for details.
                  </p>
                )}
                <Link
                  to={`/games/${encodeURIComponent(item.slug)}/reviews#review-${item.review.id}`}
                >
                  Read the full review{" "}
                  <span className="sr-only">for {item.game}</span> ↗
                </Link>
              </li>
            ))}
          </ul>
          <p className="sr-only" role="status">
            {announcement}
          </p>
        </>
      ) : (
        !resource.loading && (
          <div className="discovery-empty">
            <p>
              No published customer reviews yet. Feedback will appear here after
              moderation under the accepted review policy.
            </p>
          </div>
        )
      )}
    </section>
  );
}
