export const brand = {
  name: "PLAYORA",
  description: "Game boosting. Account trading.",
} as const;

export function BrandLogo({
  tone = "dark",
}: {
  tone?: "dark" | "light" | "mono";
}) {
  return (
    <img
      className="brand-logo"
      src={`/brand/playora-${tone}.svg`}
      alt={brand.name}
      width={551}
      height={104}
    />
  );
}
