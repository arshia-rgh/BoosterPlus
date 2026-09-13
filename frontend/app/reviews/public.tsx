import { Link, useLoaderData, useSearchParams } from "react-router";
import type { Feed } from "./model";
export default function PublicReviews() {
  const feed = useLoaderData<Feed>(),
    [params] = useSearchParams(),
    next = new URLSearchParams(params),
    first = new URLSearchParams(params);
  next.set("after", feed.next);
  first.delete("after");
  return (
    <main id="main" className="page catalog-page">
      <Link to="/games">← Game catalog</Link>
      <p className="eyebrow">Verified-purchase feedback</p>
      <h1>{feed.game.configuration.name} customer reviews</h1>
      <p>
        Customers write feedback after completed paid purchases. Administrators
        moderate publication under the accepted content policy and may add a
        labeled response.
      </p>
      {feed.game.paused && (
        <p>Sales are paused. Published review history remains available.</p>
      )}
      {feed.count > 0 ? (
        <section
          className="review-ratings catalog-section"
          aria-label="Published review ratings"
        >
          <h2>{(feed.rating_sum / feed.count).toFixed(1)} / 5</h2>
          <p>
            {feed.count} published {feed.count === 1 ? "review" : "reviews"}
          </p>
          <dl>
            {feed.histogram.map((bucket) => (
              <div key={bucket.rating}>
                <dt>{bucket.rating} / 5</dt>
                <dd>
                  <progress
                    aria-label={`${String(bucket.rating)} star reviews`}
                    value={bucket.count}
                    max={feed.count}
                  />
                  {bucket.count} {bucket.count === 1 ? "review" : "reviews"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <p>No published reviews yet.</p>
      )}
      {(params.has("service") || params.has("package")) && (
        <p>
          <Link to={`/games/${feed.game.slug}/reviews`}>
            Show all game reviews
          </Link>
        </p>
      )}
      <section aria-label="Published customer reviews">
        {feed.items.map((item) => (
          <article className="catalog-section" key={item.id}>
            <h2>Verified customer · {item.rating}/5</h2>
            <time dateTime={item.published_at}>
              {new Date(item.published_at).toLocaleDateString()}
            </time>
            {item.purchase_status === "purchase_status_updated" && (
              <p>
                The purchase status changed after this verified review was
                submitted. This historical feedback remains visible.
              </p>
            )}
            {item.purchase_status === "fulfillment_status_updated" && (
              <p>
                The fulfillment status changed after completion. This historical
                feedback remains visible.
              </p>
            )}
            {item.purchase_status === "refund_recorded" && (
              <p>
                A verified refund was recorded for this purchase. The customer's
                feedback remains visible.
              </p>
            )}
            {item.purchase_status === "dispute_in_progress" && (
              <p>
                A service case is in progress. The customer's feedback remains
                visible.
              </p>
            )}
            <p className="preserve-lines">{item.body}</p>
            <dl>
              {item.feedback.map((field, index) => (
                <div key={index}>
                  <dt>{field.label}</dt>
                  <dd>
                    {Array.isArray(field.value)
                      ? field.value.join(", ")
                      : String(field.value)}
                  </dd>
                </div>
              ))}
            </dl>
            {item.response && (
              <section aria-label="PLAYORA response">
                <h3>PLAYORA response</h3>
                <p className="preserve-lines">{item.response}</p>
              </section>
            )}
            <details>
              <summary>Accepted publication policy</summary>
              <p className="preserve-lines">{item.policy_content}</p>
            </details>
          </article>
        ))}
      </section>
      {feed.next && (
        <Link className="button" to={`?${next.toString()}`}>
          Older published reviews
        </Link>
      )}
      {params.has("after") && (
        <Link className="button" to={`?${first.toString()}`}>
          Newest published reviews
        </Link>
      )}
      {feed.game.configuration.review_policy && (
        <details className="catalog-section">
          <summary>Current review publication policy</summary>
          <p className="preserve-lines">
            {feed.game.configuration.review_policy.content}
          </p>
        </details>
      )}
    </main>
  );
}
