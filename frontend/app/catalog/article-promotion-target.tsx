import { Anchor } from "../portal-router";
import { articlePath } from "../news/model";
import { useState } from "react";
import { Action, ErrorNotice, Select } from "./controls";
import type { Promotion } from "./discovery-model";
import { useResource } from "../orders/resource";
import { publicPageSchema, publicSchema } from "../news/model";
export default function ArticlePromotionTarget({
  slug,
  value,
  change,
}: {
  slug: string;
  value: Promotion;
  change: (patch: Partial<Promotion>) => void;
}) {
  const [after, setAfter] = useState("");
  const r = useResource(
    `/games/${encodeURIComponent(slug)}/news?after=${encodeURIComponent(after)}`,
    publicPageSchema,
  );
  const items = r.data?.items ?? [];
  return (
    <>
      <p>
        Feature an exact published article revision. There is no price, coupon
        or stock for editorial content. A correction requires reviewing the
        featured revision again.
      </p>
      <ErrorNotice error={r.error} />
      {r.loading && <p role="status">Loading published articles…</p>}
      <Select
        label="Published article"
        value={value.article_id ?? ""}
        disabled={r.loading || !!r.error}
        options={[
          ["", "Choose a published article"],
          ...(value.article_id && !items.some((v) => v.id === value.article_id)
            ? [[value.article_id, "Selected article — details below"] as const]
            : []),
          ...items.map((v) => [v.id, v.definition.title] as const),
        ]}
        change={(id) => {
          const v = items.find((a) => a.id === id);
          if (v)
            change({
              article_id: v.id,
              article_slug: v.definition.slug,
              release_id: v.revision_id,
            });
        }}
      />
      {!!value.article_slug && (
        <Selected slug={slug} value={value} change={change} />
      )}
      {items.length === 0 && !r.loading && !r.error && (
        <p>No published articles on this page.</p>
      )}
      <div className="catalog-actions">
        {r.data?.next && (
          <Action
            disabled={r.loading}
            onClick={() => {
              setAfter(r.data?.next ?? "");
            }}
          >
            More articles
          </Action>
        )}
        {after && (
          <Action
            onClick={() => {
              setAfter("");
            }}
          >
            First articles
          </Action>
        )}
        {!!r.error && <Action onClick={r.reload}>Retry articles</Action>}
      </div>
    </>
  );
}
function Selected({
  slug,
  value,
  change,
}: {
  slug: string;
  value: Promotion;
  change: (patch: Partial<Promotion>) => void;
}) {
  const r = useResource(
    `/games/${encodeURIComponent(slug)}/news/${encodeURIComponent(value.article_slug ?? "")}`,
    publicSchema,
  );
  const revised =
    r.data &&
    (r.data.revision_id !== value.release_id || r.data.id !== value.article_id);
  return (
    <section aria-label="Selected article">
      <ErrorNotice error={r.error} />
      {r.loading && <p role="status">Checking selected article…</p>}
      {!!r.error && (
        <p>
          The saved article is unavailable. Its selection remains in this draft;
          retry or choose another published article.
        </p>
      )}
      {r.data && (
        <>
          <h4>{r.data.definition.title}</h4>
          <Anchor
            href={articlePath(slug, r.data.definition.slug)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read current published article (opens a new tab)
          </Anchor>
          <p>
            {r.data.definition.author} · {r.data.definition.kind}
          </p>
          {revised && (
            <section role="alert">
              <p>
                This article has changed. The old featured revision is no longer
                shown. Review the current article before replacing it.
              </p>
              <Action
                disabled={r.loading || !!r.error}
                onClick={() => {
                  if (r.data)
                    change({
                      article_id: r.data.id,
                      article_slug: r.data.definition.slug,
                      release_id: r.data.revision_id,
                    });
                }}
              >
                Use current published article
              </Action>
            </section>
          )}
        </>
      )}
      <Action disabled={r.loading} onClick={r.reload}>
        Refresh selected article
      </Action>
    </section>
  );
}
