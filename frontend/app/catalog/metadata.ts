import type { Release } from "./model";
export function gameMetadata({
  data,
}: { data?: Release & { public_origin: string | null } } = {}) {
  if (!data)
    return [
      { title: "Game services — PLAYORA" },
      { name: "robots", content: "noindex" },
    ];
  return [
    { title: `${data.configuration.name} — PLAYORA` },
    { name: "description", content: data.configuration.description },
    ...(data.public_origin
      ? [
          {
            tagName: "link",
            rel: "canonical",
            href: `${data.public_origin}/games/${data.slug}`,
          },
        ]
      : []),
  ];
}
