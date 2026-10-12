import type { Definition, Block } from "./model";
import { safeLink } from "./model";
import ShopArtwork from "../shop/artwork";
import "../shop/shop.css";
import "./news.css";
export function ArticleContent({ value }: { value: Definition }) {
  const headings = value.blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.kind === "heading");
  return (
    <article className="news-article">
      <p className="eyebrow">
        {value.kind === "patch" ? "Patch notes" : value.kind}
      </p>
      <h2>{value.title || "Untitled article"}</h2>
      <p className="news-summary">{value.summary}</p>
      <p className="quiet">
        By {value.author || "Author not set"}
        {value.game_version && ` · Game version ${value.game_version}`}
      </p>
      {value.asset && (
        <figure>
          <ShopArtwork source={value.asset} alt={value.asset_alt} />
          <figcaption>{value.asset_source}</figcaption>
        </figure>
      )}
      {headings.length > 1 && (
        <nav className="news-contents" aria-label="Article contents">
          <h3>In this article</h3>
          <ul>
            {headings.map(({ block, index }) => (
              <li key={index}>
                <a href={`#article-section-${String(index)}`}>{block.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="news-body">
        {value.blocks.map((block, index) => (
          <ContentBlock key={index} value={block} index={index} />
        ))}
      </div>
      <aside className="news-attribution">
        <h3>Sources & attribution</h3>
        <p>{value.source}</p>
        {value.source_url && safeLink(value.source_url) && (
          <a href={value.source_url} rel="noopener noreferrer">
            Read the source
          </a>
        )}
      </aside>
    </article>
  );
}
function ContentBlock({ value: b, index }: { value: Block; index: number }) {
  switch (b.kind) {
    case "heading":
      return b.level === 3 ? (
        <h4 id={`article-section-${String(index)}`}>{b.text}</h4>
      ) : (
        <h3 id={`article-section-${String(index)}`}>{b.text}</h3>
      );
    case "paragraph":
      return <p>{b.text}</p>;
    case "quote":
      return <blockquote>{b.text}</blockquote>;
    case "code":
      return (
        <pre
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The bounded code region needs focus for native keyboard scrolling.
          tabIndex={0}
          aria-label="Code example"
        >
          <code>{b.text}</code>
        </pre>
      );
    case "link":
      return safeLink(b.url) ? (
        <p>
          <a href={b.url} rel="noopener noreferrer">
            {b.text}
          </a>
        </p>
      ) : (
        <p>{b.text} · Link unavailable</p>
      );
    case "list":
      return (
        <ul>
          {b.items?.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        <figure>
          <ShopArtwork source={b.url} alt={b.alt} lazy />
          <figcaption>
            {b.text}
            {b.source && ` · ${b.source}`}
          </figcaption>
        </figure>
      );
    case "gallery":
      return (
        <div
          className="news-image-row"
          role="group"
          aria-label={b.text || "Article images"}
        >
          {b.images?.map((image, i) => (
            <figure key={i}>
              <ShopArtwork source={image.url} alt={image.alt} lazy />
              <figcaption>
                {image.caption}
                {image.source && ` · ${image.source}`}
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case "table":
      return (
        <div
          className="news-table"
          role="region"
          aria-label={b.text}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The named table region needs focus for native horizontal keyboard scrolling.
          tabIndex={0}
        >
          <table>
            <caption>{b.text}</caption>
            <thead>
              <tr>
                {b.headers?.map((text, i) => (
                  <th scope="col" key={i}>
                    {text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows?.map((row, i) => (
                <tr key={i}>
                  {row.map((text, j) => (
                    <td key={j}>{text}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
