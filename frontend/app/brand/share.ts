export function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function shareMetadata(origin: string | null) {
  if (!origin) return [];
  return [
    { property: "og:title", content: "PLAYORA — Game boosting & accounts" },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "PLAYORA" },
    { property: "og:url", content: origin + "/" },
    { property: "og:image", content: origin + "/brand/playora-share.jpg" },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "675" },
    {
      property: "og:image:alt",
      content:
        "Miya, Illidan and Ahri in PLAYORA’s green fantasy temple artwork",
    },
  ];
}
