import { Anchor } from "../portal-router";
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
          <Anchor href={kind ? `/policies/${kind}` : "/terms"}>
            Read the current published version
          </Anchor>
          . Your accepted agreement is not changed by viewing a newer version.
        </p>
      )}
      {data.sections.length > 0 && (
        <nav aria-label="Policy contents" className="policy-contents">
          <Anchor
            href={`/terms${requestedVersion ? `?version=${encodeURIComponent(requestedVersion)}` : ""}`}
            aria-current={!kind ? "page" : undefined}
          >
            Account terms
          </Anchor>
          {data.sections.map((section) => (
            <Anchor
              key={section.kind}
              href={`/policies/${section.kind}${requestedVersion ? `?version=${encodeURIComponent(requestedVersion)}` : ""}`}
              aria-current={section.kind === kind ? "page" : undefined}
            >
              {section.title}
            </Anchor>
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
        <Anchor href="/privacy">Your data & privacy</Anchor>
        <Anchor href="/contact">Ask a question</Anchor>
      </div>
    </main>
  );
}
