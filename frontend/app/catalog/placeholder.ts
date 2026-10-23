import type { Release } from "./model";

export function isPlaceholderGame(release: Release): boolean {
  const config = release.configuration;
  const policies = config.discovery?.capabilities;
  return (
    !release.paused &&
    config.services.length === 0 &&
    config.packages.length === 0 &&
    !config.intake &&
    !config.discovery?.metrics &&
    policies?.length === 4 &&
    ["boost", "accounts", "shop", "news"].every((service) =>
      policies.some(
        (policy) => policy.service === service && policy.state === "off",
      ),
    )
  );
}
