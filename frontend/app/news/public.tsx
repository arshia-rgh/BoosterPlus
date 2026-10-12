import "../catalog/service-tiles.css";
import {
  useRevalidator,
  Link,
  useLoaderData,
  useParams,
  useSearchParams,
} from "../portal-router";
import { useState } from "react";
import { Action, Select, Text } from "../catalog/controls";
import { kinds, articlePath } from "./model";
import { ArticleContent } from "./content";
import type { loadArticle, loadNews } from "./loaders.server";
import ShopArtwork from "../shop/artwork";
import "./news.css";
export function NewsIndex() {
  const { page, slug } = useLoaderData<typeof loadNews>();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const query = new URLSearchParams();
  for (const k of ["q", "kind", "after"]) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  return (
    <section className="news-index">
      <header>
        <p className="eyebrow">FROM THE EDITORS</p>
        <h2>News & guides</h2>
        <p>Game updates, patch notes and useful reading from PLAYORA staff.</p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(query);
          next.delete("after");
          if (q) next.set("q", q);
          else next.delete("q");
          setParams(next, { preventScrollReset: true });
        }}
      >
        <Text label="Search news and guides" value={q} change={setQ} />
        <button className="button compact" type="submit">
          Search articles
        </button>
      </form>
      <Select
        label="Reading type"
        value={params.get("kind") ?? ""}
        options={[["", "All articles"], ...kinds]}
        change={(v) => {
          const next = new URLSearchParams(query);
          next.delete("after");
          if (v) next.set("kind", v);
          else next.delete("kind");
          setParams(next, { preventScrollReset: true });
        }}
      />
      {page.items.length === 0 && (
        <section>
          <h3>No articles found</h3>
          <p>Try another search or return later for published updates.</p>
          <Action
            onClick={() => {
              setQ("");
              setParams({});
            }}
          >
            Clear news filters
          </Action>
        </section>
      )}
      <div className="news-cards service-tiles">
        {page.items.map((v) => (
          <article className="news-card" key={v.id}>
            <ShopArtwork
              placement="card"
              source={v.definition.asset}
              alt={v.definition.asset_alt}
              lazy
            />
            <p className="eyebrow">{v.definition.kind}</p>
            <h3>
              <Link
                preventScrollReset
                to={`${articlePath(slug, v.definition.slug)}${query.size ? `?${query.toString()}` : ""}`}
              >
                {v.definition.title}
              </Link>
            </h3>
            <p>{v.definition.summary}</p>
            <p className="quiet">
              {v.definition.author} ·{" "}
              <time dateTime={v.published_at}>
                {v.published_at.slice(0, 10)}
              </time>
              {v.definition.game_version && ` · ${v.definition.game_version}`}
            </p>
          </article>
        ))}
      </div>
      <div className="catalog-actions">
        {page.next && (
          <Link
            className="button compact"
            to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: page.next }).toString()}`}
            preventScrollReset
          >
            More articles
          </Link>
        )}
        {query.has("after") && (
          <Action
            onClick={() => {
              query.delete("after");
              setParams(query);
            }}
          >
            First articles
          </Action>
        )}
      </div>
    </section>
  );
}
export function NewsArticle() {
  const { article, related, relatedUnavailable } =
    useLoaderData<typeof loadArticle>();
  const [params] = useSearchParams();
  const { slug = "" } = useParams();
  const revalidator = useRevalidator();
  const query = new URLSearchParams();
  for (const k of ["q", "kind", "after"]) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  return (
    <section className="news-index">
      <Link
        className="context-back"
        preventScrollReset
        to={`/games/${slug}/news${query.size ? `?${query.toString()}` : ""}`}
      >
        ← Back to news & guides
      </Link>
      <p className="quiet">
        Published{" "}
        <time dateTime={article.published_at}>
          {article.published_at.slice(0, 10)}
        </time>
        {article.updated_at !== article.published_at && (
          <>
            {" "}
            · Updated{" "}
            <time dateTime={article.updated_at}>
              {article.updated_at.slice(0, 10)}
            </time>
          </>
        )}
      </p>
      <ArticleContent value={article.definition} />
      {relatedUnavailable && (
        <section>
          <h3>Related reading unavailable</h3>
          <p>This article remains available.</p>
          <Action
            disabled={revalidator.state !== "idle"}
            onClick={() => {
              void revalidator.revalidate();
            }}
          >
            Retry related reading
          </Action>
        </section>
      )}
      {related.length > 0 && (
        <section>
          <h3>Related reading</h3>
          <div className="news-cards service-tiles">
            {related.map((v) => (
              <article className="news-card" key={v.id}>
                <h4>
                  <Link
                    to={`${articlePath(slug, v.definition.slug)}${query.size ? `?${query.toString()}` : ""}`}
                    preventScrollReset
                  >
                    {v.definition.title}
                  </Link>
                </h4>
                <p>{v.definition.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
