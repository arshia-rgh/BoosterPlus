type Kind = "boost" | "accounts" | "shop" | "payment" | "news";
const paths: Record<Kind, string> = {
  boost: "m28 7-13 19h10l-5 15 15-22H25z",
  accounts:
    "M31 17a7 7 0 1 1-14 0 7 7 0 0 1 14 0M11 39v-5c0-7 26-7 26 0v5M7 17l-4 4 4 4m34-8 4 4-4 4",
  shop: "M11 17h26l-2 24H13zM18 17v-5a6 6 0 0 1 12 0v5M20 28l4 4 5-7",
  payment: "M32 14c-3-6-19-5-18 3 1 8 20 5 20 14 0 9-18 10-22 2M24 5v38",
  news: "M9 8h30v33H9zM15 15h18M15 22h8v8h-8zM28 22h5m-5 7h5M15 35h18",
};
const marks: Record<Kind, readonly string[]> = {
  boost: ["›››", "↗", "⚡", "››"],
  accounts: ["♙", "✓", "⇄", "◇"],
  shop: ["✦", "+", "◇", "✓"],
  payment: ["₿", "Ξ", "₮", "Ł"],
  news: ["#", "≡", "↗", "+"],
};
/** Decorative symbols never advertise supported checkout assets or networks. */
export function ServiceSymbol({ kind }: { kind: Kind }) {
  // eslint-disable-next-line security/detect-object-injection -- Kind is a closed union indexing authored SVG data, never user input.
  const path = paths[kind];
  // eslint-disable-next-line security/detect-object-injection -- Kind selects only these five static decorative symbol sets.
  const symbols = marks[kind];
  return (
    <div className={`service-symbol symbol-${kind}`} aria-hidden="true">
      <div className="symbol-halo" />
      <div className="symbol-core">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={path} />
        </svg>
      </div>
      {symbols.map((mark, i) => (
        <span key={mark} className={`symbol-mark mark-${String(i)}`}>
          {mark}
        </span>
      ))}
      <span className="symbol-trail" />
      <span className="symbol-trail second-trail" />
    </div>
  );
}
