import type { loadTerms } from "./loaders.server";
import PolicyText from "./policy-text";
import "./public-info.css";
export default function PolicyDocument({
  data,
  requestedVersion = "",
  kind = "",
}: {
  data: Awaited<ReturnType<typeof loadTerms>>;
  requestedVersion?: string;
  kind?: string;
}) {
  const chosen = data.sections.find((section) => section.kind === kind);
  return (
    <main id="main" className="page public-info policy-page">
      <title>{`${chosen?.title ?? "Account terms"} | PLAYORA`}</title>
      <p className="eyebrow">TERMS & POLICIES</p>
      <h1>
        {chosen?.title ??
          (data.preview
            ? "Development preview account terms"
            : "Account terms and privacy")}
      </h1>
      <p>Version: {data.version}</p>
      {requestedVersion && (
        <p className="policy-version">
          You are reading the requested agreement version.{" "}
          <a href={kind ? `/policies/${kind}` : "/terms"}>
            Read the current published version
          </a>
          . Your accepted agreement is not changed by viewing a newer version.
        </p>
      )}
      {data.sections.length > 0 && (
        <nav aria-label="Policy contents" className="policy-contents">
          <a
            href={`/terms${requestedVersion ? `?version=${encodeURIComponent(requestedVersion)}` : ""}`}
            aria-current={!kind ? "page" : undefined}
          >
            Account terms
          </a>
          {data.sections.map((section) => (
            <a
              key={section.kind}
              href={`/policies/${section.kind}${requestedVersion ? `?version=${encodeURIComponent(requestedVersion)}` : ""}`}
              aria-current={section.kind === kind ? "page" : undefined}
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}
      {chosen ? (
        <PolicyText
          text={chosen.text}
          prefix={`policy-${chosen.kind}-clause`}
        />
      ) : (
        <>
          <PolicyText text={data.text} prefix="account-clause" />
          {data.sections.map((section) => (
            <section
              key={section.kind}
              aria-labelledby={`policy-${section.kind}`}
            >
              <h2 id={`policy-${section.kind}`}>{section.title}</h2>
              <PolicyText
                text={section.text}
                prefix={`policy-${section.kind}-clause`}
              />
            </section>
          ))}
        </>
      )}
      <div className="catalog-actions">
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            window.print();
          }}
        >
          Print this policy
        </button>
        <a href="/privacy">Your data & privacy</a>
        <a href="/support">Ask a question</a>
      </div>
    </main>
  );
}
