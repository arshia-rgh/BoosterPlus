const documentTitle = /^PLAYORA (Terms of Service|Privacy Notice)$/;
const clauseTitle = /^\d{1,2}\. [^\n]{1,120}$/;

function FactTable({ lines }: { lines: string[] }) {
  const rows = lines.map((line) =>
    line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim()),
  );
  const headings = rows[0] ?? [];
  return (
    <dl className="policy-facts">
      {rows.slice(2).map((row, index) => (
        <div key={index}>
          <dt>
            <span className="policy-fact-label">{headings[0]}</span>
            {row[0]}
          </dt>
          {row.slice(1).map((cell, column) => (
            <dd key={column}>
              <span className="policy-fact-label">{headings[column + 1]}</span>
              {cell}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

export default function PolicyText({
  text,
  prefix,
}: {
  text: string;
  prefix: string;
}) {
  const blocks = text.split(/\n\s*\n/).filter((block) => block.trim());
  const grouped = blocks.some((block) => documentTitle.test(block));
  const headings = blocks.flatMap((block, index) =>
    documentTitle.test(block) || clauseTitle.test(block)
      ? [{ text: block, id: `${prefix}-${String(index)}` }]
      : [],
  );
  return (
    <div className="policy-reader">
      {headings.length > 1 && (
        <details className="policy-jump">
          <summary>On this page · {headings.length} sections</summary>
          <nav aria-label="Jump to a policy section">
            <ul>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      )}
      <div className="legal-text policy-body">
        {blocks.map((block, index) => {
          const id = `${prefix}-${String(index)}`;
          if (documentTitle.test(block))
            return (
              <h2 key={id} id={id} tabIndex={-1}>
                {block}
              </h2>
            );
          if (clauseTitle.test(block)) {
            const Heading = grouped ? "h3" : "h2";
            return (
              <Heading key={id} id={id} tabIndex={-1}>
                {block}
              </Heading>
            );
          }
          if (block === "Account damage caused by our service") {
            const Heading = grouped ? "h4" : "h3";
            return <Heading key={id}>{block}</Heading>;
          }
          const lines = block.split("\n");
          if (lines.every((line) => line.startsWith("- ")))
            return (
              <ul key={id}>
                {lines.map((line, item) => (
                  <li key={item}>{line.slice(2)}</li>
                ))}
              </ul>
            );
          if (
            lines.length > 2 &&
            lines.every((line) => line.startsWith("|") && line.endsWith("|")) &&
            /^\|[\s|:-]+\|$/.test(lines[1] ?? "") &&
            lines.every(
              (line) => line.split("|").length === lines[0]?.split("|").length,
            )
          )
            return <FactTable key={id} lines={lines} />;
          return <p key={id}>{block}</p>;
        })}
      </div>
    </div>
  );
}
