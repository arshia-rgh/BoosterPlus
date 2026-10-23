/** Explicit published-region aliases only: never guess eligibility from a title. */
const regions: Record<string, readonly string[] | undefined> = {
  global: ["global"],
  worldwide: ["global"],
  indonesia: ["id"],
  philippines: ["ph"],
  russia: ["ru"],
  turkey: ["tr"],
  türkiye: ["tr"],
  singapore: ["sg"],
  malaysia: ["my"],
  "singapore / malaysia": ["sg", "my"],
  "singapore/malaysia": ["sg", "my"],
  "united states": ["us"],
  "united states of america": ["us"],
};

export function RegionBadge({ values }: { values: string[] }) {
  const flags = Array.from(
    new Set(
      values.flatMap((value) => regions[value.trim().toLowerCase()] ?? []),
    ),
  );
  if (!flags.length) return null;
  return (
    <span className="shop-region-badge" aria-hidden="true">
      {flags.map((flag) =>
        flag === "global" ? (
          <svg
            key={flag}
            data-region="global"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18M5 6.5h14M5 17.5h14" />
          </svg>
        ) : (
          <img
            key={flag}
            data-region={flag}
            src={`/region-flags/${flag}.svg`}
            alt=""
            width="24"
            height="18"
          />
        ),
      )}
    </span>
  );
}
